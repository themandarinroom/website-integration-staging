const endpoint = 'https://australia-southeast1-the-mandarin-room-staging.cloudfunctions.net';
const emailPattern = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/u;
const emailInPublicText = /[^\s@]+@[^\s@.]+\.[^\s@.]+/u;
const labels = ['1 star / 1 星', ...[2,3,4,5].map(n => `${n} stars / ${n} 星`)];
const stars = [1,2,3,4,5];

export async function feedbackCall(operation, data, user) {
  const headers = {'Content-Type':'application/json'};
  if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(`${endpoint}/${operation}`, {
      method:'POST', headers, body:JSON.stringify({data}), credentials:'omit',
      cache:'no-store', signal:controller.signal
    });
    const body = await response.json();
    if (!response.ok || body.error || !body.result) {
      throw Object.assign(new Error('Feedback request failed'), {code:body.error?.status});
    }
    return body.result;
  } finally {
    clearTimeout(timer);
  }
}

export function feedbackForm() {
  return `<form class="contact-form" aria-describedby="feedback-privacy">
    <fieldset class="feedback-rating">
      <legend>Overall Rating (Optional) <span lang="zh-Hans">整体评分（可选）</span></legend>
      <div class="feedback-stars">${stars.map((n,i) => `<label>
        <input type="radio" name="rating" value="${n}" aria-label="${labels[i]}">
        <span aria-hidden="true">☆</span></label>`).join('')}</div>
      <button class="text-button feedback-clear" type="button" disabled>Clear rating <span lang="zh-Hans">清除评分</span></button>
    </fieldset>
    <div class="form-row">
      <label>Name <span lang="zh-Hans">姓名</span><input name="displayName" maxlength="80" autocomplete="off"></label>
      <label>Email <span lang="zh-Hans">邮箱</span><input type="email" name="email" maxlength="254" autocomplete="off"></label>
    </div>
    <label>Comment <span lang="zh-Hans">留言</span><textarea name="comment" maxlength="2000" rows="4"></textarea></label>
    <label hidden class="feedback-trap">Leave this field empty<input name="feedbackCheck" tabindex="-1" autocomplete="off"></label>
    <p class="data-note" id="feedback-privacy">Choose a rating or write a comment. Name and email are optional. Approved feedback and any name you provide may appear publicly. Email stays private. Keep personal information out of your comment.
      <span lang="zh-Hans">请选择评分或填写留言。姓名和邮箱可选。审核通过后，反馈及填写的姓名可能公开。邮箱不会公开。请勿在留言中填写个人信息。</span></p>
    <button type="submit" class="button">Submit Feedback <span lang="zh-Hans">提交反馈</span></button>
    <p class="feedback-message" role="status"></p>
  </form>`;
}

export function communityFeedback() {
  return `<section class="community-feedback" aria-labelledby="community-title">
    <h2 id="community-title">Community Feedback <span lang="zh-Hans">用户反馈</span></h2>
    <div data-feedback-entries></div><p role="status" data-feedback-status></p>
    <button type="button" class="button secondary" data-feedback-more hidden>Load more / 加载更多</button>
  </section>`;
}

function element(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

export function feedbackCard(entry) {
  const card = document.createElement('article');
  card.className = 'feedback-card';
  card.append(element('h3',entry.displayName || 'Anonymous / 匿名用户'));
  if (entry.rating != null) {
    const rating = element('p','★'.repeat(entry.rating) + '☆'.repeat(5-entry.rating));
    rating.className = 'feedback-card-rating';
    rating.setAttribute('aria-label',`${entry.rating} out of 5 stars / ${entry.rating} 星（满分 5 星）`);
    card.append(rating);
  }
  if (entry.comment) {
    const comment = element('p',entry.comment);
    comment.className = 'feedback-comment';
    comment.dir = 'auto';
    card.append(comment);
  }
  const date = element('time',new Intl.DateTimeFormat('en-AU',{dateStyle:'medium'}).format(new Date(entry.createdAt)));
  date.dateTime = entry.createdAt;
  card.append(date);
  return card;
}

export function wireFeedback(root) {
  const form = root.querySelector('.contact-form');
  const radios = [...form.querySelectorAll('[name=rating]')];
  const clear = form.querySelector('.feedback-clear');
  const submit = form.querySelector('[type=submit]');
  const message = form.querySelector('.feedback-message');
  let previousPayload, requestId;
  const rating = () => Number(radios.find(input => input.checked)?.value) || null;
  function renderStars() {
    const selected = rating();
    radios.forEach(input => {
      const filled = Number(input.value) <= selected;
      input.nextElementSibling.classList.toggle('is-filled',filled);
      input.nextElementSibling.textContent = filled ? '★' : '☆';
    });
    clear.disabled = selected === null;
  }
  form.addEventListener('change',renderStars);
  clear.addEventListener('click',() => {
    radios.forEach(input => { input.checked = false; });
    radios[0].focus();
    renderStars();
  });

  form.addEventListener('submit',async event => {
    event.preventDefault();
    if (submit.disabled) return;
    const values = new FormData(form);
    const data = {
      displayName:values.get('displayName').trim(), email:values.get('email').trim(),
      comment:values.get('comment').trim(), rating:rating(), feedbackCheck:values.get('feedbackCheck')
    };
    if (!data.rating && !data.comment) {
      message.textContent = 'Choose a rating or write a comment. / 请选择评分或填写留言。';
      return;
    }
    if (data.email && !emailPattern.test(data.email)) {
      message.textContent = 'Enter a valid email address. / 请输入有效的邮箱地址。';
      form.elements.email.focus();
      return;
    }
    if ([data.displayName,data.comment].some(value => emailInPublicText.test(value.normalize('NFKC')))) {
      message.textContent = 'Enter email addresses only in the private email field. / 邮箱地址只能填写在邮箱栏。';
      return;
    }

    const payload = JSON.stringify(data);
    if (payload !== previousPayload) {
      requestId = crypto.randomUUID();
      previousPayload = payload;
    }
    const controls = [...form.querySelectorAll('input, textarea, button')];
    controls.forEach(control => { control.disabled = true; });
    message.textContent = 'Submitting feedback… / 正在提交…';
    try {
      const result = await feedbackCall('submitFeedback',{...data,id:requestId});
      if (result.accepted !== true) throw new Error('Feedback was not accepted');
      form.reset();
      previousPayload = undefined;
      message.textContent = 'Thank you! Your feedback has been submitted and is awaiting approval. 感谢您的反馈！您的留言已提交，等待管理员审核。';
    } catch (error) {
      message.textContent = error.code === 'RESOURCE_EXHAUSTED'
        ? 'Too many submissions. Please try again later. / 提交次数过多，请稍后再试。'
        : 'Submission could not be confirmed. Your feedback is still in the form. Please try again. / 无法确认提交。内容已保留，请重试。';
    } finally {
      controls.forEach(control => { control.disabled = false; });
      renderStars();
    }
  });

  const entries = root.querySelector('[data-feedback-entries]');
  const status = root.querySelector('[data-feedback-status]');
  const more = root.querySelector('[data-feedback-more]');
  let cursor = null;
  async function load() {
    more.disabled = true;
    status.textContent = 'Loading feedback… / 正在加载反馈…';
    try {
      const page = await feedbackCall('listPublicFeedback',{cursor});
      entries.append(...page.entries.map(feedbackCard));
      cursor = page.cursor;
      status.textContent = entries.children.length ? '' : 'No approved feedback yet. / 暂无审核通过的反馈。';
      more.hidden = !cursor;
      more.textContent = 'Load more / 加载更多';
    } catch {
      status.textContent = 'Feedback could not be loaded. / 暂时无法加载反馈。';
      more.hidden = false;
      more.textContent = 'Try again / 重试';
    } finally {
      more.disabled = false;
    }
  }
  more.addEventListener('click',load);
  void load();
}
