import React from 'react';
import { SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View, Pressable } from 'react-native';

const sections = [
  { icon: '🧭', title: 'Маршруты', subtitle: 'Ищи трассы и сохраняй треки', tag: 'НАВИГАЦИЯ' },
  { icon: '📍', title: 'Дневник поездок', subtitle: 'История выездов и впечатления', tag: 'ПОЕЗДКИ' },
  { icon: '🏍️', title: 'Мой гараж', subtitle: 'Мотоцикл, настройки и моточасы', tag: 'ТЕХНИКА' },
  { icon: '🔧', title: 'Обслуживание', subtitle: 'Следи за расходниками и ТО', tag: 'СЕРВИС' },
];

export default function App() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#10130F" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>СООБЩЕСТВО ЭНДУРО</Text>
            <Text style={styles.logo}>ENDURO<Text style={styles.logoAccent}> HUB</Text></Text>
          </View>
          <View style={styles.avatar}><Text style={styles.avatarText}>R</Text></View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>ТВОЯ СЛЕДУЮЩАЯ ПРИКЛЮЧЕНИЕ</Text>
          <Text style={styles.heroTitle}>ГРЯЗЬ. ТРАССА. СВОБОДА.</Text>
          <Text style={styles.heroText}>Всё для эндуро — в одном месте.</Text>
          <Pressable style={styles.primaryButton} onPress={() => {}}>
            <Text style={styles.primaryButtonText}>НАЧАТЬ ПОЕЗДКУ  →</Text>
          </Pressable>
          <Text style={styles.heroMark}>🏁</Text>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>ТВОЙ ЭНДУРО МИР</Text>
          <Text style={styles.sectionHint}>ВЫБЕРИ РАЗДЕЛ</Text>
        </View>

        {sections.map((item) => (
          <Pressable key={item.title} style={styles.card} onPress={() => {}}>
            <View style={styles.cardIcon}><Text style={styles.iconText}>{item.icon}</Text></View>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTag}>{item.tag}</Text>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>RIDE YOUR WAY</Text>
          <Text style={styles.footerText}>Создано для тех, кто выбирает бездорожье.</Text>
        </View>
      </ScrollView>
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
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
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
});
