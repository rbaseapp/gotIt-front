// Interactive behaviour of the public landing page. Ported from the supplied static page's app.js:
// it runs against a shadow root so the page's styles and ids stay isolated from the app.

export function initLanding(root, ctx) {
const T = ctx.t;
const UI_LANG = ctx.lang;
const RTL = ctx.dir === 'rtl';


const cleanups = [];
const host = root.querySelector('.gl-root');
const on = (target, type, fn, options) => { target.addEventListener(type, fn, options); cleanups.push(() => target.removeEventListener(type, fn, options)); };
const $ = (s, scope = root) => scope.querySelector(s);
const $$ = (s, scope = root) => [...scope.querySelectorAll(s)];
const media = query => typeof matchMedia === 'function' ? matchMedia(query) : { matches: false, addEventListener() {}, removeEventListener() {} };
const reduceQuery = media('(prefers-reduced-motion: reduce)');
let manuallyReduced = false;
let reduced = reduceQuery.matches;
const motionButton = $('#motion-toggle');
function setMotion() {
 reduced = manuallyReduced || reduceQuery.matches;
 host.classList.toggle('reduced-motion', reduced);
 host.classList.toggle('js-motion', !reduced);
 motionButton.setAttribute('aria-pressed', String(reduced));
 motionButton.textContent = reduced ? T('j171') : T('j172');
}
setMotion();
on(reduceQuery, 'change', setMotion);
motionButton.addEventListener('click', () => { manuallyReduced = !manuallyReduced; setMotion(); if (reduceQuery.matches) toast(T('j173')); });
const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => entries.forEach(entry => {
 if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
}), { threshold: .1, rootMargin: '0px 0px -15px 0px' }) : { observe: el => el.classList.add('visible'), unobserve() {}, disconnect() {} };
$$('.reveal').forEach(el => observer.observe(el));
cleanups.push(() => observer.disconnect());

const menuButton = $('.menu-toggle'), mobileNav = $('#mobile-nav');
function closeMenu() { menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', T('j174')); mobileNav.hidden = true; }
menuButton.addEventListener('click', () => { const expanded = menuButton.getAttribute('aria-expanded') === 'true'; menuButton.setAttribute('aria-expanded', String(!expanded)); menuButton.setAttribute('aria-label', expanded ? T('j174') : T('j175')); mobileNav.hidden = expanded; });
$$('a', mobileNav).forEach(a => a.addEventListener('click', closeMenu));
on(root, 'keydown', e => { if (e.key === 'Escape') closeMenu(); });
on(window, 'resize', () => { if (innerWidth > 900) closeMenu(); }, { passive: true });

let scrollPending = false;
function updateScroll() { const top = scrollY; const total = document.documentElement.scrollHeight - innerHeight; $('.reading-progress').style.setProperty('--progress', `${total > 0 ? top / total * 100 : 0}%`); $('.site-header').classList.toggle('scrolled', top > 20); scrollPending = false; }
on(window, 'scroll', () => { if (!scrollPending) { scrollPending = true; requestAnimationFrame(updateScroll); } }, { passive: true });
updateScroll();

// New reference-based character artwork; pupils move in a separate SVG layer.
const eyeSurface = $('.tracking-eyes');
const pupils = $$('.pupil');
let pointer = { x: innerWidth / 2, y: innerHeight / 2 }, eyeFrame = null;
const precisePointer = media('(pointer:fine)');
function moveEyes() {
 eyeFrame = null;
 if (reduced || !precisePointer.matches) return;
 const rect = eyeSurface.getBoundingClientRect();
 if (rect.bottom < 0 || rect.top > innerHeight) return;
 pupils.forEach(pupil => {
  const cx = rect.left + Number(pupil.dataset.cx) / 1254 * rect.width;
  const cy = rect.top + Number(pupil.dataset.cy) / 1254 * rect.height;
  const dx = pointer.x - cx, dy = pointer.y - cy;
  const len = Math.hypot(dx, dy) || 1;
  const strength = Math.min(len / 220, 1);
  pupil.setAttribute('transform', `translate(${dx / len * strength * 14} ${dy / len * strength * 12})`);
 });
}
on(window, 'pointermove', e => { pointer = { x: e.clientX, y: e.clientY }; if (!eyeFrame) eyeFrame = requestAnimationFrame(moveEyes); }, { passive: true });
on(root, 'pointerleave', () => pupils.forEach(pupil => pupil.removeAttribute('transform')));

$('#year').textContent = String(new Date().getFullYear());
let toastTimer;
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('active'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('active'), 4200); }

function speak(word, rate = .8) {
 if (!('speechSynthesis' in window)) { toast(T('j176')); return; }
 speechSynthesis.cancel();
 const phrase = new SpeechSynthesisUtterance(word); phrase.lang = 'en-US'; phrase.rate = rate;
 const voice = speechSynthesis.getVoices().find(v => /^en[-_]/i.test(v.lang)); if (voice) phrase.voice = voice;
 phrase.onerror = () => toast(T('j177'));
 speechSynthesis.speak(phrase);
}
on(root, 'click', e => { const trigger = e.target.closest('[data-speak]'); if (trigger) speak(trigger.dataset.speak, Number(trigger.dataset.rate) || .8); });
let saved = false;
$('#select-word').addEventListener('click', () => { $('.browser-demo').classList.add('word-selected'); $('#save-word').focus({ preventScroll: true }); });
$('#save-word').addEventListener('click', () => {
 saved = !saved;
 $('#save-word').innerHTML = saved ? '<svg><use href="#check"/></svg> ' + T('j178') : '<svg><use href="#plus"/></svg> ' + T('j179');
 $('.save-feedback').textContent = saved ? T('j180') : '';
 $('.browser-demo').classList.toggle('word-selected', saved);
});

// Tiny client-side samples, intentionally not connected to a user account.
const panel = $('#game-panel');
let game = 'flash', xp = 0;
const awarded = new Set();
function addXP(key, amount) { if (!awarded.has(key)) { awarded.add(key); xp += amount; $('#xp-value').textContent = xp; } }
function bindTabs(buttons, activate, orientation = 'horizontal') {
 buttons.forEach((button, i) => button.addEventListener('keydown', e => {
  let index = i;
  if (e.key === 'Home') index = 0;
  else if (e.key === 'End') index = buttons.length - 1;
  else if ((orientation === 'vertical' && e.key === 'ArrowDown') || (orientation === 'horizontal' && e.key === (RTL ? 'ArrowLeft' : 'ArrowRight'))) index = (i + 1) % buttons.length;
  else if ((orientation === 'vertical' && e.key === 'ArrowUp') || (orientation === 'horizontal' && e.key === (RTL ? 'ArrowRight' : 'ArrowLeft'))) index = (i - 1 + buttons.length) % buttons.length;
  else return;
  e.preventDefault(); buttons[index].focus(); activate(buttons[index]);
 }));
}
function selectGame(button) {
 game = button.dataset.game;
 $$('[data-game]').forEach(b => { const chosen = b === button; b.setAttribute('aria-selected', String(chosen)); b.tabIndex = chosen ? 0 : -1; });
 panel.setAttribute('aria-labelledby', button.id);
 renderGame();
}
$$('[data-game]').forEach(button => button.addEventListener('click', () => selectGame(button)));
bindTabs($$('[data-game]'), selectGame, 'vertical');
function feedback(text, isError = false) { $('.game-feedback', panel).textContent = text; $('.game-feedback', panel).classList.toggle('error', isError); }
let matchResizeObserver = null;
const gameShot = { flash:'game-flash-front.png',match:'game-match.png',fill:'game-fill.png',listen:'game-listen.png',speak:null };
const screenDialog = $('#screen-dialog');
$('#show-game-screen').addEventListener('click', () => {
 const file = game === 'flash' && $('.flashcard')?.classList.contains('flipped') ? 'game-flash-back.png' : gameShot[game];
 if (!file) return;
 $('#product-screenshot').src = '/landing/assets/' + file;
 $('#product-screenshot').alt = T('j181') + ' ' + ({flash:T('j182'),match:T('j183'),fill:T('j184'),listen:T('j185')}[game] || '');
 screenDialog.showModal(); host.classList.add('modal-open');
});
$('#close-screen').addEventListener('click', () => screenDialog.close());
screenDialog.addEventListener('close', () => host.classList.remove('modal-open'));
screenDialog.addEventListener('click', e => { if(e.target===screenDialog){const r=screenDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)screenDialog.close();} });
function renderGame() {
 if (matchResizeObserver) { matchResizeObserver.disconnect(); matchResizeObserver = null; }
 if ('speechSynthesis' in window) speechSynthesis.cancel();
 panel.dataset.mode = game;
 $('#show-game-screen').hidden = !gameShot[game];
 const mascotHead = text => `<div class="game-heading"><img src="/landing/assets/mochi-welcome-v3.png" alt="" width="45" height="45"><h3>${text}</h3></div>`;
 if (game === 'flash') {
  const words=[{en:'chair',he:T('j186'),example:'Please sit on the chair.',translation:T('j187')},{en:'curious',he:T('j188'),example:'I am curious to learn more.',translation:T('j189')}];
  let index=0,flipped=false;
  panel.innerHTML=mascotHead(T('j190'))+'<div class="flash-stack"><div class="flashcard" role="group" aria-label="' + T('j191') + '"><span class="flash-back-label" hidden>' + T('j192') + '</span><strong class="flash-word" lang="en">chair</strong><small class="word-type" hidden>' + T('j193') + '</small><div class="flash-example" hidden><b lang="en" dir="ltr">Please sit on the chair.</b><span>' + T('j187') + '</span></div><button class="sound-button flash-sound" data-speak="chair" aria-label="' + T('j194') + '"><svg><use href="#sound"/></svg></button></div><button class="flip-action" id="flip-card">⟳ <span>' + T('j195') + '</span></button><button class="next-flash" aria-label="' + T('j196') + '">‹</button></div><div class="flash-rating" hidden><button data-rating="easy"><b>☺ ' + T('j197') + '</b><small>' + T('j198') + '</small></button><button data-rating="almost"><b>☻ ' + T('j199') + '</b><small>' + T('j200') + '</small></button><button data-rating="hard"><b>☹ ' + T('j201') + '</b><small>' + T('j202') + '</small></button></div><div class="game-feedback flash-hint" aria-live="polite">☼ ' + T('j203') + '</div>';
  const paint = () => { const word=words[index];$('.flashcard',panel).classList.toggle('flipped',flipped);$('.flash-word',panel).textContent=flipped?word.he:word.en;$('.flash-word',panel).lang=flipped?UI_LANG:'en';$$('.flash-back-label,.word-type,.flash-example,.flash-rating',panel).forEach(el=>el.hidden=!flipped);$('.flash-example b',panel).textContent=word.example;$('.flash-example span',panel).textContent=word.translation;$('.flash-sound',panel).dataset.speak=word.en;$('.flash-sound',panel).setAttribute('aria-label',T('j204') + ' '+word.en);$('#flip-card span').textContent=flipped?T('j205'):T('j195');$('.flashcard',panel).setAttribute('aria-label',(flipped?T('j205') + ' ':T('j206') + ' ')+word.en);feedback(flipped?T('j207'):'☼ ' + T('j203')); };
  const flip = () => {flipped=!flipped;if(flipped)addXP('flash-'+index,10);paint();};
  $('#flip-card').addEventListener('click',flip);
  $('.flashcard',panel).addEventListener('click',e=>{if(!e.target.closest('button'))flip();});
  $('.flashcard',panel).addEventListener('keydown',e=>{if(e.target===e.currentTarget&&(e.key==='Enter'||e.key===' ')){e.preventDefault();flip();}});
  $('.next-flash',panel).addEventListener('click',()=>{index=(index+1)%words.length;flipped=false;paint();});
  $$('[data-rating]',panel).forEach(b=>b.addEventListener('click',()=>{feedback(b.dataset.rating==='easy'?T('j208'):T('j209'));b.classList.add('rating-selected');}));
 } else if (game === 'match') {
  panel.innerHTML=mascotHead(T('j210'))+'<div class="match-language-labels"><span>' + T('j211') + '</span><span>English A</span></div><div class="match-board"><svg class="match-lines" aria-hidden="true"></svg><div class="match-column hebrew"><button data-pair="chair" data-side="he"><i></i>' + T('j186') + '</button><button data-pair="book" data-side="he"><i></i>' + T('j212') + '</button><button data-pair="apple" data-side="he"><i></i>' + T('j213') + '</button><button data-pair="family" data-side="he"><i></i>' + T('j214') + '</button></div><div class="match-column english"><button data-pair="apple" data-side="en" lang="en"><i></i>apple</button><button data-pair="book" data-side="en" lang="en"><i></i>book</button><button data-pair="family" data-side="en" lang="en"><i></i>family</button><button data-pair="chair" data-side="en" lang="en"><i></i>chair</button></div></div><div class="game-feedback" aria-live="polite">' + T('j215') + '</div>';
  let first=null,busy=false,count=0;const matchedPairs=[];const colors=['#83aff2','#e7b359','#5ca992','#b69bdd'];
  const drawLines=()=>{if(game!=='match')return;const board=$('.match-board',panel);if(!board)return;const bounds=board.getBoundingClientRect(),svg=$('.match-lines',panel);svg.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);svg.innerHTML=matchedPairs.map((pair,i)=>{const en=$(`[data-side="en"][data-pair="${pair}"] i`,panel).getBoundingClientRect(),he=$(`[data-side="he"][data-pair="${pair}"] i`,panel).getBoundingClientRect();const x1=en.left+en.width/2-bounds.left,y1=en.top+en.height/2-bounds.top,x2=he.left+he.width/2-bounds.left,y2=he.top+he.height/2-bounds.top;return `<path d="M${x1},${y1} C${x1+45},${y1} ${x2-45},${y2} ${x2},${y2}" stroke="${colors[i%4]}"/>`;}).join('');};
  matchResizeObserver=new ResizeObserver(drawLines);matchResizeObserver.observe($('.match-board',panel));
  $$('.match-board button',panel).forEach(button=>button.addEventListener('click',()=>{
   if(busy||button.disabled)return;
   if(first===button){first.classList.remove('chosen');first=null;return;}
   if(!first||first.dataset.side===button.dataset.side){if(first)first.classList.remove('chosen');first=button;button.classList.add('chosen');return;}
   const previous=first;first=null;previous.classList.remove('chosen');
   if(previous.dataset.pair===button.dataset.pair){const color=colors[count%4];[previous,button].forEach(b=>{b.classList.add('matched');b.style.setProperty('--pair-color',color);$('i',b).textContent='✓';b.disabled=true;});matchedPairs.push(button.dataset.pair);count++;drawLines();addXP('match-'+button.dataset.pair,10);feedback(count===4?'Got it! ' + T('j216'):T('j217'));}
   else{busy=true;[previous,button].forEach(b=>b.classList.add('wrong'));feedback(T('j218'),true);setTimeout(()=>{[previous,button].forEach(b=>b.classList.remove('wrong'));busy=false;},550);}
  }));
 } else if (game === 'fill') {
  panel.innerHTML=mascotHead(T('j219'))+'<div class="sentence-card"><button class="sound-button" data-speak="Please sit on the chair" aria-label="' + T('j220') + '"><svg><use href="#sound"/></svg></button><p lang="en" dir="ltr">Please sit on the <span id="blank-word" role="region" aria-label="' + T('j221') + '" tabindex="0"></span>.</p><small id="sentence-translation">' + T('j222') + '</small></div><div class="word-bank"><span>' + T('j223') + '</span><div class="answer-options"><button draggable="true" data-answer="chair" lang="en">chair <i>⠿</i></button><button draggable="true" data-answer="water" lang="en">water <i>⠿</i></button><button draggable="true" data-answer="apple" lang="en">apple <i>⠿</i></button><button draggable="true" data-answer="book" lang="en">book <i>⠿</i></button></div></div><div class="game-feedback" aria-live="polite"></div>';
  const answer=value=>{const button=$(`[data-answer="${value}"]`,panel);if(!button)return;const correct=value==='chair';button.classList.add(correct?'correct':'incorrect');if(correct){$('#blank-word').textContent='chair';$('#blank-word').classList.add('filled');$('#sentence-translation').textContent=T('j187');addXP('fill',15);feedback(T('j224'));}else feedback(T('j225'),true);};
  $$('[data-answer]',panel).forEach(b=>{b.addEventListener('click',()=>answer(b.dataset.answer));b.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain',b.dataset.answer));});
  $('#blank-word').addEventListener('dragover',e=>e.preventDefault());$('#blank-word').addEventListener('drop',e=>{e.preventDefault();answer(e.dataTransfer.getData('text/plain'));});
 } else if (game === 'listen') {
  const letters=['a','l','w','o','e','u','l','h'];let value='';
  panel.innerHTML=mascotHead(T('j226'))+'<div class="listening-card"><div class="audio-bar"><button class="listen-control" data-speak="hello" aria-label="' + T('j227') + '"><svg><use href="#sound"/></svg></button><div class="audio-wave" aria-hidden="true">'+Array.from({length:26},(_,i)=>`<i style="--bar:${[12,23,32,18,40,25,14,35,28][i%9]}px"></i>`).join('')+'</div><button class="slow-audio" data-speak="hello" data-rate="0.55">' + T('j228') + '</button></div><form class="spelling-form"><label class="sr-only" for="spelling-word">' + T('j229') + '</label><input id="spelling-word" class="sr-only" type="text" dir="ltr" lang="en" maxlength="5" autocomplete="off" autocapitalize="none" spellcheck="false"><div class="letter-slots" dir="ltr" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div><small>' + T('j230') + '</small><div class="letter-keyboard" dir="ltr">'+letters.map((letter,i)=>`<button type="button" data-letter="${letter}" data-key="${i}">${letter}</button>`).join('')+'<button type="button" class="erase-letter" aria-label="' + T('j231') + '">⌫</button></div><button class="button small spelling-check" type="submit">' + T('j232') + '</button></form></div><div class="game-feedback" aria-live="polite"></div>';
  const paint=()=>{$$('.letter-slots span',panel).forEach((slot,i)=>{slot.textContent=value[i]||'−';slot.classList.toggle('active',i===value.length);});$('#spelling-word').value=value;};
  $('.letter-slots',panel).addEventListener('click',()=>$('#spelling-word').focus());
  $('#spelling-word').addEventListener('input',e=>{value=e.target.value.replace(/[^a-z]/gi,'').toLowerCase().slice(0,5);paint();});
  $$('[data-letter]',panel).forEach(b=>b.addEventListener('click',()=>{if(value.length<5){value+=b.dataset.letter;paint();}}));
  $('.erase-letter',panel).addEventListener('click',()=>{value=value.slice(0,-1);paint();});
  $('form',panel).addEventListener('submit',e=>{e.preventDefault();if(value==='hello'){addXP('listen',15);feedback(T('j233'));$('.letter-slots',panel).classList.add('solved');}else feedback(T('j234'),true);});paint();
 } else {
  panel.innerHTML=mascotHead(T('j235'))+'<div class="pronunciation-word" lang="en" dir="ltr"><em>hel</em>·lo</div><button class="listen-control" data-speak="hello" aria-label="' + T('j236') + '"><svg><use href="#sound"/></svg></button><p>' + T('j237') + '</p><button class="button small" id="said-word">' + T('j238') + ' <svg><use href="#check"/></svg></button><div class="game-feedback" aria-live="polite">' + T('j239') + '</div>';
  $('#said-word').addEventListener('click',()=>{addXP('speak',10);feedback(T('j240'));});
 }
}

renderGame();

const goals = {
 work: { title: T('j241'), desc: T('j242'), lessons: [[T('j243'),T('j244'),'5 ' + T('j245')],[T('j246'),T('j247'),'10 ' + T('j245')],[T('j248'),T('j249'),'7 ' + T('j245')]] },
 travel: { title: T('j250'), desc: T('j251'), lessons: [[T('j252'),T('j253'),'5 ' + T('j245')],[T('j254'),T('j255'),'10 ' + T('j245')],[T('j256'),T('j257'),'7 ' + T('j245')]] },
 start: { title: T('j258'), desc: T('j259'), lessons: [[T('j260'),T('j261'),'5 ' + T('j245')],[T('j262'),'I am / You are — ' + T('j263'),'10 ' + T('j245')],[T('j264'),T('j265'),'7 ' + T('j245')]] }
};
function chooseGoal(button) {
 $$('[data-goal]').forEach(b => { const selected = b === button; b.setAttribute('aria-selected', String(selected)); b.tabIndex = selected ? 0 : -1; });
 const goal = goals[button.dataset.goal];
 $('#program-panel').setAttribute('aria-labelledby', button.id);
 $('#program-title').textContent = goal.title; $('#program-description').textContent = goal.desc;
 $('#lesson-list').innerHTML = goal.lessons.map((lesson, index) => `<li class="${index === 0 ? 'completed' : index === 1 ? 'current' : ''}"><span class="lesson-icon">${index === 0 ? '✓' : index + 1}</span><div><strong>${lesson[0]}</strong><small>${lesson[1]}</small></div><span class="lesson-duration">${lesson[2]}</span></li>`).join('');
}
$$('[data-goal]').forEach(button => button.addEventListener('click', () => chooseGoal(button)));
bindTabs($$('[data-goal]'), chooseGoal);
chooseGoal($('#goal-work'));

let showingSummary = false;
$('#conversation-demo').addEventListener('click', () => { showingSummary = !showingSummary; $('.chat-messages').hidden = showingSummary; $('.chat-messages').style.display = showingSummary ? 'none' : ''; $('.chat-summary').hidden = !showingSummary; $('#conversation-demo').innerHTML = showingSummary ? T('j266') + ' <svg><use href="#arrow"/></svg>' : T('j267') + ' <svg><use href="#arrow"/></svg>'; });

cleanups.push(() => { if (matchResizeObserver) matchResizeObserver.disconnect(); if ('speechSynthesis' in window) speechSynthesis.cancel(); clearTimeout(toastTimer); });

// Language picker: closes on outside click / Escape; the choice switches the whole interface.
{
 const picker = $('.lang-picker');
 const button = $('.lang-button');
 const menu = $('.lang-menu');
 $('.lang-button span').textContent = ctx.languageNames[UI_LANG];
 $$('[data-lang]', menu).forEach(o => o.setAttribute('aria-selected', String(o.dataset.lang === UI_LANG)));
 const setOpen = open => { menu.hidden = !open; button.setAttribute('aria-expanded', String(open)); };
 on(button, 'click', e => { e.stopPropagation(); setOpen(menu.hidden); if (!menu.hidden) $('[aria-selected="true"]', menu).focus(); });
 on(root, 'click', e => { if (!picker.contains(e.target)) setOpen(false); });
 on(root, 'keydown', e => { if (e.key === 'Escape') { setOpen(false); button.focus(); } });
 $$('[data-lang]', menu).forEach(option => on(option, 'click', () => { setOpen(false); ctx.setLanguage(option.dataset.lang); }));
}

// Real destinations: in-app routes go through the router, the rest open normally.
on(root, 'click', e => {
 const link = e.target.closest('[data-destination], a[href^="#"]');
 if (!link || e.defaultPrevented) return;
 const destination = link.dataset.destination;
 if (destination) {
  e.preventDefault();
  const target = ctx.destinations[destination];
  if (!target) return;
  if (target.startsWith('/')) ctx.navigate(target);
  else if (target.startsWith('mailto:')) location.href = target;
  else window.open(target, '_blank', 'noopener,noreferrer');
  return;
 }
 const hash = link.getAttribute('href');
 e.preventDefault();
 if (hash === '#') { window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); return; }
 const el = root.getElementById ? root.getElementById(hash.slice(1)) : null;
 if (el) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
});
return () => cleanups.forEach(fn => fn());
}
