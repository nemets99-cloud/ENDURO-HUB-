import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View, Pressable, Alert } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { distanceBetween, calculateDistance, isValidRide } from './rideUtils';

const STORAGE_KEY = 'enduro-hub-rides-v1';
const INITIAL_REGION = { latitude: 47.2692, longitude: 11.4041, latitudeDelta: 0.08, longitudeDelta: 0.08 };

function formatDistance(meters) {
  return meters >= 1000 ? (meters / 1000).toFixed(2) + ' км' : Math.round(meters) + ' м';
}
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export default function App() {
  const [screen, setScreen] = useState('home');
  const [permission, setPermission] = useState('unknown');
  const [current, setCurrent] = useState(null);
  const [track, setTrack] = useState([]);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [savedRides, setSavedRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const watchRef = useRef(null);
  const startedAtRef = useRef(null);
  const startingRef = useRef(false);
  const mapRef = useRef(null);

  const distance = useMemo(() => track.reduce((sum, point, i) => i ? sum + distanceBetween(track[i - 1], point) : 0, 0), [track]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (!value) return;
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        setSavedRides(parsed.filter(isValidRide).slice(0, 30));
      }
    }).catch(() => {
      Alert.alert('Ошибка истории', 'Не удалось прочитать сохранённые поездки. Новые поездки можно записывать как обычно.');
    });
    return () => {
      if (watchRef.current) watchRef.current.remove();
    };
  }, []);

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => {
      if (startedAtRef.current) setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [recording]);

  async function getLocationPermission() {
    const result = await Location.requestForegroundPermissionsAsync();
    setPermission(result.status);
    if (result.status !== 'granted') {
      Alert.alert('Нужен доступ к GPS', 'Разреши приложению доступ к местоположению, чтобы показывать карту и записывать трек.');
      return false;
    }
    return true;
  }

  async function openMap() {
    setScreen('map');
    const allowed = await getLocationPermission();
    if (!allowed) return;
    try {
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCurrent(point);
      mapRef.current?.animateToRegion({ ...point, latitudeDelta: 0.015, longitudeDelta: 0.015 }, 700);
    } catch {
      Alert.alert('Не удалось определить место', 'Проверь GPS и попробуй ещё раз.');
    }
  }

  async function startRecording() {
    if (startingRef.current || recording) return;
    startingRef.current = true;
    setLoading(true);
    try {
      const allowed = await getLocationPermission();
      if (!allowed) return;

      const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const firstPoint = {
        latitude: first.coords.latitude,
        longitude: first.coords.longitude,
        timestamp: first.timestamp,
      };

      setTrack([firstPoint]);
      setCurrent(firstPoint);
      setElapsed(0);

      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
        (position) => {
          const point = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: position.timestamp,
          };
          setCurrent(point);
          setTrack((previous) => {
            const last = previous[previous.length - 1];
            if (last && distanceBetween(last, point) < 3) return previous;
            return [...previous, point];
          });
        },
        () => {
          Alert.alert('Проблема GPS', 'Поток GPS прервался. Останови запись и проверь геолокацию.');
        }
      );

      watchRef.current = subscription;
      startedAtRef.current = Date.now();
      setRecording(true);
    } catch {
      if (watchRef.current) {
        watchRef.current.remove();
        watchRef.current = null;
      }
      startedAtRef.current = null;
      setRecording(false);
      setTrack([]);
      setElapsed(0);
      Alert.alert('Ошибка GPS', 'Не удалось начать запись. Проверь разрешения и включённую геолокацию.');
    } finally {
      startingRef.current = false;
      setLoading(false);
    }
  }

  async function stopRecording() {
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
    const finalElapsed = startedAtRef.current
      ? Math.floor((Date.now() - startedAtRef.current) / 1000)
      : elapsed;
    const finalDistance = calculateDistance(track);
    setRecording(false);
    setElapsed(finalElapsed);
    startedAtRef.current = null;

    const ride = {
      id: String(Date.now()),
      date: new Date().toLocaleString(),
      distance: finalDistance,
      duration: finalElapsed,
      points: track,
    };
    if (track.length > 1) {
      const updated = [ride, ...savedRides].slice(0, 30);
      setSavedRides(updated);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        Alert.alert('Поездка сохранена', `Трек: ${formatDistance(finalDistance)} • ${formatDuration(finalElapsed)}`);
      } catch {
        Alert.alert('Поездка завершена', 'Не удалось сохранить трек в памяти телефона.');
      }
    } else {
      Alert.alert('Запись остановлена', 'GPS-точек пока недостаточно для сохранения маршрута.');
    }
  }

  async function exportRide(ride) {
    if (!ride?.points || ride.points.length < 2) {
      Alert.alert('Нельзя экспортировать', 'В этом маршруте недостаточно GPS-точек.');
      return;
    }
    try {
      const escapeXml = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
      const pointsXml = ride.points.map((point) => {
        const timestamp = point.timestamp ? new Date(point.timestamp).toISOString() : new Date().toISOString();
        return `      <trkpt lat="${point.latitude}" lon="${point.longitude}"><time>${timestamp}</time></trkpt>`;
      }).join('\n');
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ENDURO HUB" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${escapeXml('Поездка ' + ride.date)}</name></metadata>
  <trk><name>${escapeXml('ENDURO HUB — ' + ride.date)}</name><trkseg>
${pointsXml}
  </trkseg></trk>
</gpx>`;
      const safeDate = new Date().toISOString().replace(/[:.]/g, '-');
      const uri = FileSystem.cacheDirectory + `enduro-hub-${safeDate}.gpx`;
      await FileSystem.writeAsStringAsync(uri, xml, { encoding: FileSystem.EncodingType.UTF8 });
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Поделиться нельзя', 'На этом устройстве функция отправки файлов недоступна.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'application/gpx+xml',
        dialogTitle: 'Поделиться GPS-маршрутом',
        UTI: 'com.topografix.gpx',
      });
    } catch (error) {
      Alert.alert('Ошибка экспорта', 'Не удалось создать GPX-файл. Попробуй ещё раз.');
    }
  }

  function openRide(ride) {
    if (!isValidRide(ride)) {
      Alert.alert('Поездка недоступна', 'Данные этого маршрута повреждены.');
      return;
    }
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
    startedAtRef.current = null;
    setRecording(false);
    setTrack(ride.points);
    setCurrent(ride.points[ride.points.length - 1] || null);
    setElapsed(Number.isFinite(ride.duration) ? Math.max(0, ride.duration) : 0);
    setScreen('map');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#10130F" />
      {screen === 'map' ? (
        <View style={styles.mapScreen}>
          <View style={styles.mapHeader}>
            <Pressable onPress={() => setScreen('home')} style={styles.backButton}><Text style={styles.backText}>‹  НАЗАД</Text></Pressable>
            <Text style={styles.mapTitle}>GPS-МАРШРУТ</Text>
            <View style={{ width: 70 }} />
          </View>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={current ? { ...current, latitudeDelta: 0.03, longitudeDelta: 0.03 } : INITIAL_REGION}
            showsUserLocation
            showsMyLocationButton
            mapType="terrain"
          >
            {track.length > 0 && <Polyline coordinates={track} strokeColor="#B6F23B" strokeWidth={5} />}
            {track.length > 0 && <Marker coordinate={track[0]} title="Старт" pinColor="green" />}
            {current && <Marker coordinate={current} title="Текущее положение" />}
          </MapView>
          <View style={styles.recordPanel}>
            <View style={styles.statsRow}>
              <View><Text style={styles.statLabel}>ДИСТАНЦИЯ</Text><Text style={styles.statValue}>{formatDistance(distance)}</Text></View>
              <View><Text style={styles.statLabel}>ВРЕМЯ</Text><Text style={styles.statValue}>{formatDuration(elapsed)}</Text></View>
              <View><Text style={styles.statLabel}>ТОЧКИ GPS</Text><Text style={styles.statValue}>{track.length}</Text></View>
            </View>
            {recording ? (
              <Pressable style={[styles.recordButton, styles.stopButton]} onPress={stopRecording}><Text style={styles.recordButtonText}>■  ОСТАНОВИТЬ И СОХРАНИТЬ</Text></Pressable>
            ) : (
              <Pressable style={styles.recordButton} disabled={loading} onPress={startRecording}><Text style={styles.recordButtonText}>{loading ? 'ПОЛУЧАЮ GPS…' : '●  НАЧАТЬ ЗАПИСЬ'}</Text></Pressable>
            )}
            <Text style={styles.hint}>{recording ? 'Идёт запись GPS. Не закрывай приложение.' : 'Нажми, чтобы начать запись нового маршрута.'}</Text>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <View><Text style={styles.eyebrow}>СООБЩЕСТВО ЭНДУРО</Text><Text style={styles.logo}>ENDURO<Text style={styles.logoAccent}> HUB</Text></Text></View>
            <View style={styles.avatar}><Text style={styles.avatarText}>R</Text></View>
          </View>
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>ТВОЯ СЛЕДУЮЩАЯ ПРИКЛЮЧЕНИЕ</Text>
            <Text style={styles.heroTitle}>ГРЯЗЬ. ТРАССА. СВОБОДА.</Text>
            <Text style={styles.heroText}>Всё для эндуро — в одном месте.</Text>
            <Pressable style={styles.primaryButton} onPress={openMap}><Text style={styles.primaryButtonText}>НАЧАТЬ ПОЕЗДКУ  →</Text></Pressable>
            <Text style={styles.heroMark}>🏁</Text>
          </View>
          <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>ТВОЙ ЭНДУРО МИР</Text><Text style={styles.sectionHint}>ВЫБЕРИ РАЗДЕЛ</Text></View>
          <Pressable style={styles.card} onPress={openMap}>
            <View style={styles.cardIcon}><Text style={styles.iconText}>🧭</Text></View>
            <View style={styles.cardCopy}><Text style={styles.cardTag}>НАВИГАЦИЯ</Text><Text style={styles.cardTitle}>GPS-маршруты</Text><Text style={styles.cardSubtitle}>Карта, запись и сохранение трека</Text></View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <View style={styles.card}>
            <View style={styles.cardIcon}><Text style={styles.iconText}>📍</Text></View>
            <View style={styles.cardCopy}><Text style={styles.cardTag}>ПОЕЗДКИ</Text><Text style={styles.cardTitle}>Дневник поездок</Text><Text style={styles.cardSubtitle}>История твоих выездов</Text></View>
            <Text style={styles.chevron}>›</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.cardIcon}><Text style={styles.iconText}>🏍️</Text></View>
            <View style={styles.cardCopy}><Text style={styles.cardTag}>ТЕХНИКА</Text><Text style={styles.cardTitle}>Мой гараж</Text><Text style={styles.cardSubtitle}>Мотоцикл и моточасы</Text></View>
            <Text style={styles.chevron}>›</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.cardIcon}><Text style={styles.iconText}>🔧</Text></View>
            <View style={styles.cardCopy}><Text style={styles.cardTag}>СЕРВИС</Text><Text style={styles.cardTitle}>Обслуживание</Text><Text style={styles.cardSubtitle}>Расходники и напоминания о ТО</Text></View>
            <Text style={styles.chevron}>›</Text>
          </View>
          <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>СОХРАНЁННЫЕ ПОЕЗДКИ</Text><Text style={styles.sectionHint}>{savedRides.length} ШТ.</Text></View>
          {savedRides.length === 0 ? <Text style={styles.emptyText}>Пока нет поездок. Запиши свой первый маршрут!</Text> : savedRides.map((ride) => (
            <View key={ride.id} style={styles.savedRide}>
              <Pressable style={styles.savedRideInfo} onPress={() => openRide(ride)}>
                <Text style={styles.savedDate}>{ride.date}</Text>
                <Text style={styles.savedStats}>{formatDistance(ride.distance)}  •  {formatDuration(ride.duration)}</Text>
              </Pressable>
              <Pressable style={styles.exportButton} onPress={() => exportRide(ride)}>
                <Text style={styles.exportButtonText}>GPX ↗</Text>
              </Pressable>
            </View>
          ))}
          <View style={styles.footer}><Text style={styles.footerTitle}>RIDE YOUR WAY</Text><Text style={styles.footerText}>Создано для тех, кто выбирает бездорожье.</Text></View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#10130F' },
  container: { padding: 20, paddingBottom: 36 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  eyebrow: { color: '#9BA493', fontSize: 10, letterSpacing: 2.2, fontWeight: '700' },
  logo: { color: '#F5F6F1', fontSize: 27, fontWeight: '900', letterSpacing: -1 },
  logoAccent: { color: '#B6F23B' },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#242B20', borderWidth: 1, borderColor: '#52633B', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#B6F23B', fontWeight: '900', fontSize: 18 },
  hero: { backgroundColor: '#20291B', borderRadius: 22, padding: 22, minHeight: 220, overflow: 'hidden', borderWidth: 1, borderColor: '#3D4B2D', marginBottom: 28 },
  heroLabel: { color: '#B6F23B', fontSize: 9, fontWeight: '900', letterSpacing: 1.7 },
  heroTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', lineHeight: 32, marginTop: 14, maxWidth: 260 },
  heroText: { color: '#C0C8B8', fontSize: 13, marginTop: 8 },
  primaryButton: { backgroundColor: '#B6F23B', paddingVertical: 13, paddingHorizontal: 16, borderRadius: 9, alignSelf: 'flex-start', marginTop: 20 },
  primaryButtonText: { color: '#17200E', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  heroMark: { position: 'absolute', right: 8, bottom: 8, fontSize: 78, opacity: 0.18 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, marginTop: 8 },
  sectionTitle: { color: '#F3F5EE', fontSize: 14, fontWeight: '900', letterSpacing: 0.8 },
  sectionHint: { color: '#77816D', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  card: { backgroundColor: '#1A1F18', borderRadius: 15, borderWidth: 1, borderColor: '#2D3528', padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#293322', alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  iconText: { fontSize: 23 },
  cardCopy: { flex: 1 },
  cardTag: { color: '#9BB36B', fontSize: 8, fontWeight: '900', letterSpacing: 1.4, marginBottom: 4 },
  cardTitle: { color: '#F4F5F0', fontSize: 16, fontWeight: '800' },
  cardSubtitle: { color: '#929B8B', fontSize: 11, marginTop: 4 },
  chevron: { color: '#B6F23B', fontSize: 28, paddingLeft: 8 },
  footer: { alignItems: 'center', marginTop: 24 },
  footerTitle: { color: '#65734F', fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  footerText: { color: '#697263', fontSize: 10, marginTop: 6 },
  mapScreen: { flex: 1 },
  mapHeader: { height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#10130F' },
  backButton: { width: 70 },
  backText: { color: '#B6F23B', fontSize: 11, fontWeight: '900' },
  mapTitle: { color: '#F4F5F0', fontSize: 13, fontWeight: '900', letterSpacing: 1.4 },
  map: { flex: 1 },
  recordPanel: { backgroundColor: '#171D14', padding: 18, borderTopWidth: 1, borderColor: '#36432B' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statLabel: { color: '#8B977F', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  statValue: { color: '#F4F5F0', fontSize: 19, fontWeight: '900', marginTop: 5 },
  recordButton: { backgroundColor: '#B6F23B', borderRadius: 11, alignItems: 'center', paddingVertical: 16 },
  stopButton: { backgroundColor: '#D95B4B' },
  recordButtonText: { color: '#17200E', fontSize: 12, fontWeight: '900', letterSpacing: 0.6 },
  hint: { color: '#8B9582', textAlign: 'center', fontSize: 10, marginTop: 10 },
  emptyText: { color: '#8B9582', fontSize: 12, paddingVertical: 14 },
  savedRide: { backgroundColor: '#1A1F18', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  savedRideInfo: { flex: 1, paddingVertical: 2 },
  exportButton: { backgroundColor: '#293322', borderWidth: 1, borderColor: '#52633B', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12, marginLeft: 10 },
  exportButtonText: { color: '#B6F23B', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  savedDate: { color: '#A6B09C', fontSize: 10 },
  savedStats: { color: '#F4F5F0', fontSize: 14, fontWeight: '800', marginTop: 5 },
});
