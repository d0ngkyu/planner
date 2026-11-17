import { App } from '@capacitor/app';
import { registerPlugin } from '@capacitor/core';
import { widgetSnapshot } from './widget.js';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { planNotifications } from './schedule.js';

const SETTINGS = 'planner.native.notifications.v1';
const PlannerWidget = registerPlugin('PlannerWidget');
const PlannerCompanion = registerPlugin('PlannerCompanion');
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
let granted = false;
let queue = Promise.resolve();
const native = globalThis.plannerNative = {
  async companion(options) { return PlannerCompanion.update(options); },
  async updateWidget(records) { await PlannerWidget.update({ data: JSON.stringify(widgetSnapshot(records)) }); },
  get granted() { return granted; },
  get settings() { return read(SETTINGS, { morning: '08:00', evening: '21:00', nag: false }); },
  async refreshPermission() { granted = (await LocalNotifications.checkPermissions()).display === 'granted'; },
  async enable() {
    granted = (await LocalNotifications.requestPermissions()).display === 'granted';
    if (!granted) throw new Error('휴대폰 설정에서 플래너 알림을 허용해 주세요.');
    await native.reschedule();
  },
  async saveSettings(settings) { localStorage.setItem(SETTINGS, JSON.stringify(settings)); await native.reschedule(); },
  reschedule() {
    queue = queue.catch(() => {}).then(async () => {
      await native.refreshPermission();
      if (!granted) return;
      const notifications = planNotifications(read('planner.records.v1', {}), native.settings, read('planner.focus.v1', null));
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length) await LocalNotifications.cancel(pending);
      if (notifications.length) await LocalNotifications.schedule({ notifications });
    });
    return queue;
  },
  async ping() {
    await native.enable();
    await LocalNotifications.schedule({ notifications: [{ id: 10002, title: '플래너 테스트', body: '휴대폰 알림이 연결됐어요.', schedule: { at: new Date(Date.now() + 3000) } }] });
  },
  async exportBackup(text, filename) {
    const file = await Filesystem.writeFile({ path: filename, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: '플래너 백업', files: [file.uri], dialogTitle: '백업 파일 저장 또는 공유' });
  },
  async share(text) { await Share.share({ title: '주간 리포트', text }); },
};
await native.refreshPermission();
await import('../app.js');
await LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
  const extra = notification.extra || {};
  window.dispatchEvent(new CustomEvent('planner-open', { detail: `./?${new URLSearchParams(extra)}` }));
});
await App.addListener('backButton', async () => {
  const dialogs = [...document.querySelectorAll('dialog[open]')];
  if (dialogs.length) dialogs.at(-1).close();
  else await App.minimizeApp();
});
await App.addListener('appStateChange', async ({ isActive }) => {
  window.dispatchEvent(new Event('planner-flush'));
  if (isActive) {
    await native.refreshPermission();
    window.dispatchEvent(new Event('planner-resume'));
  }
  native.reschedule().catch(console.error);
});
native.reschedule().catch(console.error);
native.updateWidget(read('planner.records.v1', {})).catch(console.error);
