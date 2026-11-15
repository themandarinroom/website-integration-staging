import {assertAuthorisedTeacher} from './admin-session.mjs?v=feedback-1';
import {getFirebaseServices} from './unit-viewer/firebase.js';
import {feedbackCall, feedbackCard} from './feedback.mjs';

const panel = document.querySelector('#comments-panel');
const status = document.querySelector('#comments-status');
const entries = document.querySelector('#comments-entries');
const filter = document.querySelector('#comments-filter');
const refresh = document.querySelector('#comments-refresh');
const more = document.querySelector('#comments-more');
const statusLabels = [...filter.options].reduce((labels,option) => {
  labels[option.value] = option.textContent;
  return labels;
}, {});
let user, cursor, generation = 0;

function renderEntry(entry) {
  const card = feedbackCard(entry);
  const privateDetails = document.createElement('p');
  privateDetails.textContent = entry.email ? `Private email / 私密邮箱 · ${entry.email}` : '';
  privateDetails.hidden = !entry.email;
  const current = document.createElement('p');
  current.textContent = statusLabels[entry.status];
  const actions = document.createElement('div');
  actions.className = 'feedback-admin-controls';
  for (const [action,label] of Object.entries({approve:'Approve / 通过',reject:'Reject / 拒绝',delete:'Delete / 删除'})) {
    if ((action === 'approve' && entry.status === 'approved') || (action === 'reject' && entry.status === 'rejected')) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button secondary';
    button.textContent = label;
    button.onclick = () => moderate(entry,action);
    actions.append(button);
  }
  card.append(privateDetails,current,actions);
  return card;
}

function setBusy(busy) {
  for (const control of [filter,refresh,more,...entries.querySelectorAll('button')]) control.disabled = busy;
}

async function load(append = false, success = '') {
  if (!user) return;
  const request = ++generation;
  setBusy(true);
  if (!append) {
    entries.replaceChildren();
    cursor = null;
    more.hidden = true;
  }
  status.textContent = 'Loading comments… / 正在加载留言…';
  try {
    const page = await feedbackCall('moderateFeedback',{action:'list',status:filter.value,cursor},user);
    if (request !== generation) return;
    entries.append(...page.entries.map(renderEntry));
    cursor = page.cursor;
    more.hidden = !cursor;
    status.textContent = success || (entries.childElementCount ? '' : 'No comments in this category. / 此分类暂无留言。');
  } catch (error) {
    if (request === generation) showError(error,'Comments could not be loaded. Refresh to retry. / 无法加载留言，请刷新重试。');
  } finally {
    if (request === generation) setBusy(false);
  }
}

function showError(error, fallback) {
  if (['PERMISSION_DENIED','UNAUTHENTICATED'].includes(error.code)) {
    user = undefined;
    entries.replaceChildren();
    panel.hidden = true;
    status.textContent = 'Open Admin on the main site with an authorised account. / 请使用授权账号从网站首页打开管理员面板。';
    return;
  }
  status.textContent = fallback;
}

async function moderate(entry,action) {
  if (!user || filter.disabled) return;
  if (action === 'delete' && !window.confirm('Permanently delete this feedback? / 确定永久删除这条反馈吗？')) return;
  const request = ++generation;
  setBusy(true);
  status.textContent = 'Saving moderation decision… / 正在保存审核结果…';
  try {
    const result = await feedbackCall('moderateFeedback',{id:entry.id,action,expectedStatus:entry.status},user);
    if (request !== generation) return;
    if (result.updated !== true) throw new Error('Moderation was not confirmed');
    await load(false,'Moderation saved. / 审核结果已保存。');
    if (user) refresh.focus();
  } catch (error) {
    if (request === generation) showError(error,'Could not confirm the change. Refresh before retrying. / 无法确认更改，请刷新后重试。');
  } finally {
    if (request === generation) setBusy(false);
  }
}

filter.onchange = () => load();
refresh.onclick = () => load();
more.onclick = () => load(true);

async function start() {
  const services = await getFirebaseServices();
  services.authSdk.onAuthStateChanged(services.auth,async () => {
    const request = ++generation;
    user = undefined;
    entries.replaceChildren();
    panel.hidden = true;
    try {
      const authorised = await assertAuthorisedTeacher(services);
      if (request !== generation) return;
      user = authorised;
      panel.hidden = false;
      await load();
    } catch {
      if (request === generation) status.textContent = 'Open Admin on the main site with an authorised account. / 请使用授权账号从网站首页打开管理员面板。';
    }
  });
}

start().catch(() => {
  status.textContent = 'Administrator sign-in is unavailable. / 管理员登录暂不可用。';
});
