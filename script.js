// ==================== SPEECH CONTROLLER ====================
const SpeechController = {
    synth: window.speechSynthesis,
    isSpeaking: false,
    async speak(text, rate = 1.0) {
        if (!this.synth) throw new Error();
        this.synth.cancel();
        await new Promise(r => setTimeout(r, 30));
        return new Promise((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'pt-BR';
            utterance.rate = rate;
            utterance.onstart = () => { this.isSpeaking = true; };
            utterance.onend = () => { this.isSpeaking = false; resolve(); };
            utterance.onerror = reject;
            this.synth.speak(utterance);
        });
    },
    stop() { this.synth.cancel(); this.isSpeaking = false; },
    async activate() {
        return new Promise((resolve) => {
            const silent = new SpeechSynthesisUtterance('');
            silent.onend = () => resolve(true);
            silent.onerror = () => resolve(false);
            this.synth.speak(silent);
            setTimeout(() => resolve(true), 200);
        });
    }
};

// ==================== ELEMENTOS DOM ====================
const texto = document.getElementById('texto');
const btnLer = document.getElementById('btnLer');
const btnRepetir = document.getElementById('btnRepetir');
const btnVoltar = document.getElementById('btnVoltar');
const btnProximo = document.getElementById('btnProximo');
const btnParar = document.getElementById('btnParar');
const btnLimpar = document.getElementById('btnLimpar');
const btnCamera = document.getElementById('btnCamera');
const btnImportar = document.getElementById('btnImportar');
const btnCompartilhar = document.getElementById('btnCompartilhar');
const btnTraduzir = document.getElementById('btnTraduzir');
const btnFavorito = document.getElementById('btnFavorito');
const micBtn = document.getElementById('micBtn');
const listeningDiv = document.getElementById('listeningStatus');
const btnActivate = document.getElementById('btnActivateAudio');
const audioActivationDiv = document.getElementById('audioActivation');
const configModal = document.getElementById('configModal');
const closeModal = document.querySelector('.close-modal');
const btnConfig = document.getElementById('configBtn');
const themeToggle = document.getElementById('themeToggle');
const velocidadeSlider = document.getElementById('velocidade');
const velMenos = document.getElementById('velMenos');
const velMais = document.getElementById('velMais');
const velValor = document.getElementById('velValor');
const pausaSlider = document.getElementById('pausaSlider');
const pausaValor = document.getElementById('pausaValor');
const pausaVirgulaSlider = document.getElementById('pausaVirgulaSlider');
const pausaVirgulaValor = document.getElementById('pausaVirgulaValor');
const pausaPontoSlider = document.getElementById('pausaPontoSlider');
const pausaPontoValor = document.getElementById('pausaPontoValor');
const pausaPalavrasSlider = document.getElementById('pausaPalavrasSlider');
const pausaPalavrasValor = document.getElementById('pausaPalavrasValor');
const repetirFraseSlider = document.getElementById('repetirFraseSlider');
const repetirFraseValor = document.getElementById('repetirFraseValor');
const modoDitado = document.getElementById('modoDitado');
const fraseAtualSpan = document.getElementById('fraseAtual');
const fraseDestaque = document.getElementById('fraseAtualDestaque');
const statusSpan = document.getElementById('status');
const fonteSelect = document.getElementById('fonteSelect');
const tamanhoSlider = document.getElementById('tamanhoFonteSlider');
const tamanhoValor = document.getElementById('tamanhoFonteValor');
const btnSalvarConfig = document.getElementById('salvarConfig');
const wordCountSpan = document.getElementById('wordCount');
const charCountSpan = document.getElementById('charCount');
const readingTimeSpan = document.getElementById('readingTime');
const progressBar = document.getElementById('progressBar');
const historySelect = document.getElementById('historySelect');
const favoritosSelect = document.getElementById('favoritosSelect');
const fileInput = document.getElementById('fileInput');
const imageInput = document.getElementById('imageInput');

// ==================== VARIÁVEIS ====================
let frases = [];
let indiceAtual = 0;
let emModoContinuo = false;
let estaEsperando = false;
let audioAtivo = false;
let favoritos = JSON.parse(localStorage.getItem('favoritos_textos') || '[]');
let historico = JSON.parse(localStorage.getItem('historico_textos') || '[]');
let recognition = null;
let listening = false;
let pausaEntreFrases = 0.3;
let pausaVirgula = 0.3;
let pausaPonto = 0.8;
let pausaPalavras = 0;
let repetirFrase = 1;
let repeticoesRestantes = 0;

// ==================== DIVISÃO INTELIGENTE ====================
function dividirEmChunks(texto) {
    const separadores = /(,|\.|;|:)/g;
    let pedacos = [];
    let ultimoIndex = 0;
    let match;
    while ((match = separadores.exec(texto)) !== null) {
        let fim = match.index + match[0].length;
        let pedaco = texto.substring(ultimoIndex, fim).trim();
        if (pedaco) pedacos.push(pedaco);
        ultimoIndex = fim;
    }
    if (ultimoIndex < texto.length) {
        let resto = texto.substring(ultimoIndex).trim();
        if (resto) pedacos.push(resto);
    }
    return pedacos;
}

async function falarComPausas(textoOriginal, velocidade) {
    let chunks = [];
    if (pausaPalavras > 0) {
        const palavras = textoOriginal.split(/\s+/);
        for (let i = 0; i < palavras.length; i += pausaPalavras) {
            chunks.push(palavras.slice(i, i + pausaPalavras).join(' '));
        }
    } else {
        chunks = dividirEmChunks(textoOriginal);
    }
    for (let i = 0; i < chunks.length; i++) {
        if (!estaEsperando) break;
        const chunk = chunks[i];
        await SpeechController.speak(chunk, velocidade);
        let pausa = 0;
        if (chunk.match(/[,;:]/)) pausa = pausaVirgula;
        else if (chunk.match(/\.$/)) pausa = pausaPonto;
        else if (pausaPalavras === 0 && i < chunks.length-1) pausa = 0.1;
        if (pausa > 0) await new Promise(r => setTimeout(r, pausa * 1000));
    }
}

// ==================== LEITURA COM REPETIÇÃO ====================
async function lerFrase(idx, isRepeticao = false) {
    if (!audioAtivo) { statusSpan.innerText = 'Ative o áudio.'; return; }
    if (estaEsperando) return;
    if (!frases.length) { statusSpan.innerText = 'Nenhuma frase.'; return; }
    if (idx < 0 || idx >= frases.length) return;
    if (!isRepeticao) repeticoesRestantes = repetirFrase;
    if (repeticoesRestantes > 0) {
        repeticoesRestantes--;
        SpeechController.stop();
        estaEsperando = true;
        const frase = frases[idx];
        const velocidade = parseFloat(velocidadeSlider.value);
        statusSpan.innerText = `🔊 Lendo frase ${idx+1} (${repetirFrase - repeticoesRestantes}/${repetirFrase})...`;
        try {
            await falarComPausas(frase, velocidade);
            statusSpan.innerText = '✅ Concluído.';
            if (repeticoesRestantes > 0) {
                await new Promise(r => setTimeout(r, 500));
                await lerFrase(idx, true);
                return;
            }
            if (emModoContinuo && !modoDitado.checked) {
                if (idx + 1 < frases.length) {
                    indiceAtual = idx + 1;
                    atualizarDisplayFrase();
                    await new Promise(r => setTimeout(r, pausaEntreFrases * 1000));
                    lerFrase(indiceAtual, false);
                } else {
                    emModoContinuo = false;
                    statusSpan.innerText = '🏁 Fim do texto.';
                }
            }
        } catch (err) {
            statusSpan.innerText = '❌ Erro na leitura.';
        } finally {
            estaEsperando = false;
        }
    }
}

// ==================== FUNÇÕES BÁSICAS ====================
function atualizarDisplayFrase() {
    if (!frases.length) {
        fraseAtualSpan.innerText = '(nenhuma)';
        fraseDestaque.innerText = '—';
        return;
    }
    const preview = frases[indiceAtual];
    fraseAtualSpan.innerText = `${indiceAtual+1}/${frases.length} · ${preview.substring(0,60)}${preview.length>60?'…':''}`;
    fraseDestaque.innerText = preview;
    atualizarProgresso();
}
function atualizarProgresso() {
    if (!frases.length) { progressBar.style.width = '0%'; return; }
    const percent = ((indiceAtual + 1) / frases.length) * 100;
    progressBar.style.width = percent + '%';
}
function atualizarFrases() {
    frases = dividirFrases(texto.value);
    if (!frases.length) {
        fraseAtualSpan.innerText = '(nenhuma)';
        fraseDestaque.innerText = '—';
        indiceAtual = 0;
        statusSpan.innerText = 'Digite um texto.';
        return;
    }
    if (indiceAtual >= frases.length) indiceAtual = frases.length - 1;
    atualizarDisplayFrase();
    statusSpan.innerText = `${frases.length} frase(s) carregadas.`;
    salvarUltimoTexto();
    adicionarHistorico(texto.value);
    atualizarEstatisticas();
    const isFav = favoritos.some(f => f.texto === texto.value);
    if (isFav) btnFavorito.classList.add('ativo');
    else btnFavorito.classList.remove('ativo');
}
function dividirFrases(t) {
    t = t.trim();
    if (!t) return [];
    return t.split(/(?<=[.!?])\s+/);
}
function atualizarEstatisticas() {
    const t = texto.value;
    const palavras = t.trim() ? t.trim().split(/\s+/).length : 0;
    const caracteres = t.length;
    const minutos = Math.ceil(palavras / 150);
    wordCountSpan.innerText = `${palavras} palavra${palavras!==1?'s':''}`;
    charCountSpan.innerText = `${caracteres} caractere${caracteres!==1?'s':''}`;
    readingTimeSpan.innerText = `${minutos} min leitura`;
}

// ==================== AÇÕES ====================
function lerTudo() {
    if (!audioAtivo) return;
    if (!frases.length) { statusSpan.innerText = 'Digite um texto.'; return; }
    SpeechController.stop();
    estaEsperando = false;
    emModoContinuo = !modoDitado.checked;
    repeticoesRestantes = 0;
    lerFrase(indiceAtual, false);
}
function repetirFrase() { if(audioAtivo && frases.length) { repeticoesRestantes = 0; lerFrase(indiceAtual, false); } }
function voltar() {
    if(!audioAtivo) return;
    if(indiceAtual > 0) { indiceAtual--; atualizarDisplayFrase(); repeticoesRestantes = 0; lerFrase(indiceAtual, false); }
    else statusSpan.innerText = 'Primeira frase.';
}
function proximo() {
    if(!audioAtivo) return;
    if(indiceAtual+1 < frases.length) { indiceAtual++; atualizarDisplayFrase(); repeticoesRestantes = 0; lerFrase(indiceAtual, false); }
    else statusSpan.innerText = 'Última frase.';
}
function pararTudo() { SpeechController.stop(); estaEsperando = false; emModoContinuo = false; statusSpan.innerText = 'Parado.'; }
function limparTexto() { texto.value = ''; atualizarFrases(); pararTudo(); salvarUltimoTexto(); }

// ==================== PERSISTÊNCIA ====================
function salvarConfiguracoes() {
    localStorage.setItem('fonteLeitor', fonteSelect.value);
    localStorage.setItem('tamanhoFonteLeitor', tamanhoSlider.value);
    aplicarFonteETamanho();
    localStorage.setItem('pausaVirgula', pausaVirgulaSlider.value);
    localStorage.setItem('pausaPonto', pausaPontoSlider.value);
    localStorage.setItem('pausaPalavras', pausaPalavrasSlider.value);
    localStorage.setItem('repetirFrase', repetirFraseSlider.value);
    pausaVirgula = parseFloat(pausaVirgulaSlider.value);
    pausaPonto = parseFloat(pausaPontoSlider.value);
    pausaPalavras = parseInt(pausaPalavrasSlider.value);
    repetirFrase = parseInt(repetirFraseSlider.value);
    pausaVirgulaValor.innerText = pausaVirgula;
    pausaPontoValor.innerText = pausaPonto;
    pausaPalavrasValor.innerText = pausaPalavras;
    repetirFraseValor.innerText = repetirFrase;
    statusSpan.innerText = '✅ Configurações salvas';
    setTimeout(() => { if(!estaEsperando) statusSpan.innerText = 'Pronto'; }, 1500);
    configModal.style.display = 'none';
}
function carregarConfiguracoes() {
    const vel = localStorage.getItem('velocidadeLeitor');
    if (vel) { velocidadeSlider.value = vel; velValor.innerText = vel; }
    const pausa = localStorage.getItem('pausaLeitor');
    if (pausa) { pausaSlider.value = pausa; pausaValor.innerText = pausa; pausaEntreFrases = parseFloat(pausa); }
    const pv = localStorage.getItem('pausaVirgula');
    const pp = localStorage.getItem('pausaPonto');
    const ppal = localStorage.getItem('pausaPalavras');
    const rep = localStorage.getItem('repetirFrase');
    if (pv) { pausaVirgulaSlider.value = pv; pausaVirgula = parseFloat(pv); pausaVirgulaValor.innerText = pv; }
    if (pp) { pausaPontoSlider.value = pp; pausaPonto = parseFloat(pp); pausaPontoValor.innerText = pp; }
    if (ppal) { pausaPalavrasSlider.value = ppal; pausaPalavras = parseInt(ppal); pausaPalavrasValor.innerText = ppal; }
    if (rep) { repetirFraseSlider.value = rep; repetirFrase = parseInt(rep); repetirFraseValor.innerText = rep; }
    modoDitado.checked = localStorage.getItem('modoDitadoLeitor') === 'true';
    const fonte = localStorage.getItem('fonteLeitor');
    const tam = localStorage.getItem('tamanhoFonteLeitor');
    if (fonte) fonteSelect.value = fonte;
    if (tam) { tamanhoSlider.value = tam; tamanhoValor.innerText = tam + 'px'; }
    aplicarFonteETamanho();
    const textoSalvo = localStorage.getItem('ultimoTextoLeitor');
    if (textoSalvo && !texto.value) texto.value = textoSalvo;
    atualizarFrases();
}
function aplicarFonteETamanho() {
    const fonte = localStorage.getItem('fonteLeitor') || 'system-ui';
    const tamanho = localStorage.getItem('tamanhoFonteLeitor') || '16';
    texto.style.fontFamily = fonte;
    texto.style.fontSize = tamanho + 'px';
    fraseDestaque.style.fontFamily = fonte;
    fraseDestaque.style.fontSize = (parseInt(tamanho) + 2) + 'px';
}
function salvarUltimoTexto() { localStorage.setItem('ultimoTextoLeitor', texto.value); }
function adicionarHistorico(text) {
    if (!text.trim()) return;
    historico = historico.filter(t => t !== text);
    historico.unshift(text);
    if (historico.length > 10) historico.pop();
    localStorage.setItem('historico_textos', JSON.stringify(historico));
    atualizarSelectHistorico();
}
function atualizarSelectHistorico() {
    historySelect.innerHTML = '<option value="">📜 Histórico</option>';
    historico.forEach((h, i) => {
        const opt = document.createElement('option'); opt.value = i;
        opt.textContent = h.substring(0, 50) + (h.length>50?'…':'');
        historySelect.appendChild(opt);
    });
}
function carregarHistorico(idx) {
    if (historico[idx]) { texto.value = historico[idx]; atualizarFrases(); statusSpan.innerText = 'Histórico carregado'; }
}
function atualizarFavoritos() {
    favoritosSelect.innerHTML = '<option value="">⭐ Favoritos</option>';
    favoritos.forEach((fav, i) => {
        const opt = document.createElement('option'); opt.value = i;
        opt.textContent = fav.texto.substring(0, 50) + (fav.texto.length>50?'…':'');
        favoritosSelect.appendChild(opt);
    });
}
function adicionarFavorito() {
    const txt = texto.value.trim();
    if (!txt) return;
    if (!favoritos.some(f => f.texto === txt)) {
        favoritos.unshift({ texto: txt, data: new Date().toLocaleString() });
        if (favoritos.length > 20) favoritos.pop();
        localStorage.setItem('favoritos_textos', JSON.stringify(favoritos));
        atualizarFavoritos();
        statusSpan.innerText = '⭐ Adicionado aos favoritos';
        btnFavorito.classList.add('ativo');
    }
}
function removerFavorito() {
    const txt = texto.value.trim();
    const idx = favoritos.findIndex(f => f.texto === txt);
    if (idx !== -1) {
        favoritos.splice(idx, 1);
        localStorage.setItem('favoritos_textos', JSON.stringify(favoritos));
        atualizarFavoritos();
        statusSpan.innerText = '⭐ Removido dos favoritos';
        btnFavorito.classList.remove('ativo');
    }
}
function carregarFavorito(idx) {
    if (favoritos[idx]) { texto.value = favoritos[idx].texto; atualizarFrases(); statusSpan.innerText = 'Favorito carregado'; }
}

// ==================== COMPARTILHAR, IMPORTAR, OCR, VOZ ====================
function compartilharTexto() { if(!texto.value.trim()) return; if(navigator.share) navigator.share({title:'Leitor Ditado', text:texto.value}); else { navigator.clipboard.writeText(texto.value); statusSpan.innerText='Texto copiado!'; } }
function importarTxt() { fileInput.click(); }
fileInput.addEventListener('change', (e)=>{ const file = e.target.files[0]; if(file){ const reader = new FileReader(); reader.onload = (ev)=>{ texto.value = ev.target.result; atualizarFrases(); statusSpan.innerText='Arquivo importado!'; }; reader.readAsText(file,'UTF-8'); } fileInput.value=''; });
async function traduzirTexto() {
    const txt = texto.value.trim();
    if(!txt){ statusSpan.innerText='Nada para traduzir.'; return; }
    statusSpan.innerText='🌐 Traduzindo...';
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(txt)}&langpair=auto|pt`;
        const resp = await fetch(url);
        const data = await resp.json();
        const traduzido = data.responseData.translatedText;
        if(traduzido && traduzido!==txt){ texto.value = traduzido; atualizarFrases(); statusSpan.innerText='✅ Traduzido!'; }
        else statusSpan.innerText='⚠️ Não foi possível traduzir.';
    } catch(e){ statusSpan.innerText='❌ Erro na tradução.'; }
}
function triggerCamera(){ imageInput.click(); }
imageInput.addEventListener('change', async(e)=>{
    const file=e.target.files[0];
    if(!file) return;
    statusSpan.innerText='📷 OCR processando...';
    try{
        const worker = await Tesseract.createWorker('por');
        const {data:{text}} = await worker.recognize(file);
        await worker.terminate();
        if(text.trim()){ texto.value += (texto.value?'\n\n':'')+text; atualizarFrases(); statusSpan.innerText='✅ OCR concluído!'; }
        else statusSpan.innerText='Nenhum texto na imagem.';
    } catch(err){ statusSpan.innerText='Erro no OCR.'; }
    finally{ imageInput.value=''; }
});
function initVoice() { if(!('webkitSpeechRecognition' in window)) return; recognition = new webkitSpeechRecognition(); recognition.lang='pt-BR'; recognition.continuous=false; }
function startListening(){
    if(!recognition) initVoice();
    if(!recognition){ statusSpan.innerText='Voz não suportada'; return; }
    listening=true; micBtn.classList.add('active'); listeningDiv.classList.remove('hidden'); statusSpan.innerText='🎤 Ouvindo...';
    recognition.start();
    recognition.onresult = (ev) => {
        const cmd = ev.results[0][0].transcript.toLowerCase();
        statusSpan.innerText = `Comando: "${cmd}"`;
        if(cmd.includes('ler tudo')||cmd.includes('ler')) lerTudo();
        else if(cmd.includes('parar')) pararTudo();
        else if(cmd.includes('repetir')) repetirFrase();
        else if(cmd.includes('próximo')) proximo();
        else if(cmd.includes('voltar')) voltar();
        else if(cmd.includes('modo ditado')){ modoDitado.checked=!modoDitado.checked; salvarModoDitado(); statusSpan.innerText=`Modo ditado ${modoDitado.checked?'ativado':'desativado'}`; }
        else statusSpan.innerText=`Comando não reconhecido: "${cmd}"`;
        stopListening();
    };
    recognition.onerror = () => { stopListening(); statusSpan.innerText='Erro no reconhecimento.'; };
    recognition.onend = () => { if(listening) stopListening(); };
}
function stopListening(){ if(recognition) recognition.abort(); listening=false; micBtn.classList.remove('active'); listeningDiv.classList.add('hidden'); if(!estaEsperando) statusSpan.innerText='Pronto'; }
function salvarModoDitado() { localStorage.setItem('modoDitadoLeitor', modoDitado.checked); }
function alternarTema() {
    document.body
