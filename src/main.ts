import { LocalApi } from './local-api';
import { capabilitiesFor, chooseModel, type Conversation, type Message } from './models';
import { PushToTalk, validateImage, captureImage } from './media';
import { deleteConversation, getImage, listConversations, removeImages, saveConversation, saveImage } from './storage';
import { LiveVoiceSession } from './live-voice';
import './style.css';

const api = new LocalApi(); const ptt = new PushToTalk(); const live = new LiveVoiceSession();
const root = document.querySelector<HTMLDivElement>('#app')!;
let conversations: Conversation[] = []; let current: Conversation; let models: string[] = []; let images: string[] = [];
const id = () => crypto.randomUUID();
function newConversation(): Conversation { return { id: id(), title: 'New conversation', model: models[0] ?? 'lfm3-text', messages: [] }; }
function escapeHtml(s: string): string { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!); }
function status(message: string, error = false): void { const el = document.querySelector('#status'); if (el) { el.textContent = message; el.classList.toggle('error', error); } }
async function render(): Promise<void> {
  const messageHtml = await Promise.all(current.messages.map(async message => {
    const imgs = await Promise.all((message.images ?? []).map(async key => { const blob = await getImage(key); return blob ? `<img class="attachment" src="${URL.createObjectURL(blob)}" alt="Conversation attachment">` : ''; }));
    return `<article class="message ${message.role}"><b>${message.role === 'user' ? 'You' : 'Pi'}</b><p>${escapeHtml(message.text)}</p>${imgs.join('')}</article>`;
  }));
  root.innerHTML = `<aside><header><strong>Pi Pocket</strong><button id="new">＋</button></header><nav>${conversations.map(c => `<button class="conversation" data-id="${c.id}">${escapeHtml(c.title)}</button>`).join('')}</nav></aside><main><header><span>Local conversation</span><label>Model <select id="model">${models.map(m => `<option ${current.model === m ? 'selected' : ''}>${escapeHtml(m)}</option>`).join('')}</select></label></header><section class="messages">${messageHtml.join('') || '<p class="empty">Choose a local model and start a conversation.</p>'}</section><div id="preview">${await Promise.all(images.map(async key => { const b = await getImage(key); return b ? `<img src="${URL.createObjectURL(b)}" alt="Pending attachment"><button data-remove="${key}">×</button>` : ''; })).then(a => a.join(''))}</div><section class="composer"><textarea id="prompt" placeholder="Message your local model"></textarea><div class="controls"><input id="file" type="file" accept="image/jpeg,image/png,image/webp" hidden><button id="attach">Image</button><button id="camera">Camera</button><button id="record">Hold to record</button><button id="send">Send</button><label><input id="spoken" type="checkbox"> Spoken response</label><button id="live">Live voice</button><button id="delete">Delete conversation</button></div><p id="status"></p></section></main>`;
  document.querySelector('#new')!.addEventListener('click', async () => { current = newConversation(); conversations.unshift(current); await persist(); await render(); });
  document.querySelectorAll<HTMLButtonElement>('.conversation').forEach(b => b.onclick = async () => { current = conversations.find(c => c.id === b.dataset.id)!; images = []; await render(); });
  document.querySelector<HTMLSelectElement>('#model')!.onchange = async e => { try { current.model = chooseModel(models, current.model, (e.target as HTMLSelectElement).value); await persist(); status('Model selected'); } catch (err) { status(String(err), true); } };
  document.querySelector('#attach')!.addEventListener('click', () => document.querySelector<HTMLInputElement>('#file')!.click());
  document.querySelector<HTMLInputElement>('#file')!.onchange = async e => { try { const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return; validateImage(file); images.push(await saveImage(file)); await render(); } catch (err) { status(String(err), true); } };
  document.querySelector('#camera')!.addEventListener('click', async () => { try { images.push(await saveImage(await captureImage())); await render(); } catch (err) { status(String(err), true); } });
  document.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach(b => b.onclick = async () => { const key = b.dataset.remove!; images = images.filter(i => i !== key); await removeImages([key]); await render(); });
  const recordButton = document.querySelector<HTMLButtonElement>('#record')!;
  recordButton.onpointerdown = async e => { e.preventDefault(); try { await ptt.start(); recordButton.textContent = 'Release to transcribe'; } catch (err) { status(String(err), true); } };
  const finishRecording = async () => { try { const blob = await ptt.stop(); const text = await api.transcribe(blob); await submit(text); } catch (err) { ptt.cancel(); status(String(err), true); } finally { recordButton.textContent = 'Hold to record'; } };
  recordButton.onpointerup = finishRecording; recordButton.onpointercancel = () => { ptt.cancel(); recordButton.textContent = 'Hold to record'; status('Recording cancelled'); };
  document.querySelector('#send')!.addEventListener('click', async () => { const field = document.querySelector<HTMLTextAreaElement>('#prompt')!; await submit(field.value); });
  document.querySelector<HTMLInputElement>('#spoken')!.onchange = () => { if (document.querySelector<HTMLInputElement>('#spoken')!.checked && !capabilitiesFor(current.model).speech) status('This model does not advertise speech output.', true); };
  document.querySelector('#live')!.addEventListener('click', async () => { try { await live.start(() => {}, 'http://127.0.0.1:8091'); status('Connected to local live voice. Use Stop to end.'); } catch (err) { status(String(err), true); } });
  document.querySelector('#delete')!.addEventListener('click', async () => { const keys = current.messages.flatMap(m => m.images ?? []); await removeImages([...keys, ...images]); await deleteConversation(current.id); conversations = conversations.filter(c => c.id !== current.id); current = conversations[0] ?? newConversation(); if (!conversations.length) conversations.push(current); images = []; await persist(); await render(); });
}
async function persist(): Promise<void> { for (const conversation of conversations) await saveConversation(conversation); }
async function submit(text: string): Promise<void> {
  const clean = text.trim(); if (!clean && !images.length) return;
  if (images.length && !capabilitiesFor(current.model).image) { status(`Model ${current.model} cannot process images. Select a vision-capable model.`, true); return; }
  const currentImages = [...images]; images = [];
  const user: Message = { id: id(), role: 'user', text: clean, images: currentImages }; current.messages.push(user);
  if (current.messages.length === 1) current.title = clean.slice(0, 32) || 'Image conversation';
  await persist(); await render(); status('Waiting for local model…');
  try {
    const content = currentImages.length ? [{ type: 'text', text: clean }, ...await Promise.all(currentImages.map(async key => { const blob = await getImage(key); if (!blob) throw new Error('Image attachment is missing'); return { type: 'image_url', image_url: { url: await new Promise<string>(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.readAsDataURL(blob); }) } }; }))] : clean;
    const response = await api.chat(current.model, current.messages.map(m => ({ role: m.role, content: m === user ? content : m.text })), document.querySelector<HTMLInputElement>('#spoken')!.checked);
    if (response.audio) { const audio = new Audio(`data:audio/wav;base64,${response.audio}`); await audio.play(); }
    else if (document.querySelector<HTMLInputElement>('#spoken')!.checked) status('Speech output is unsupported by the selected local route.', true);
    current.messages.push({ id: id(), role: 'assistant', text: response.text }); await persist(); await render();
  } catch (err) { status(String(err), true); }
}
(async () => {
  try { models = await api.models(); }
  catch (err) { root.innerHTML = `<main class="startup-error"><h1>Pi Pocket</h1><p>${escapeHtml(String(err))}</p><p>Configure <code>VITE_LLAMA_SWAP_URL</code> and start local llama-swap.</p></main>`; return; }
  conversations = await listConversations(); current = conversations[0] ?? newConversation(); if (!conversations.length) conversations.push(current); await persist(); await render();
})();
