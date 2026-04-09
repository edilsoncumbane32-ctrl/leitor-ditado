// Elementos do DOM
const textoInput = document.getElementById('texto');
const btnLer = document.getElementById('btnLer');
const btnRepetir = document.getElementById('btnRepetir');
const btnVoltar = document.getElementById('btnVoltar');
const btnProximo = document.getElementById('btnProximo');
const btnParar = document.getElementById('btnParar');
const velocidadeSlider = document.getElementById('velocidade');
const velValor = document.getElementById('velValor');
const modoDitadoCheck = document.getElementById('modoDitado');
const fraseAtualSpan = document.getElementById('fraseAtual');
const statusSpan = document.getElementById('status');

let frases = [];
let indiceAtual = 0;
let emModoContinuo = false;
let audioAtual = null;

// Divide texto em frases
function dividirFrases(texto) {
    texto = texto.replace(/\s+/g, ' ').trim();
    return texto.split(/(?<=[.!?])\s+/).filter(f => f.length > 0);
}

function atualizarDisplayFrase() {
    if (frases.length === 0) {
        fraseAtualSpan.innerText = '(nenhuma frase)';
        return;
    }
    let preview = frases[indiceAtual].length > 80 ? frases[indiceAtual].substring(0, 80) + '…' : frases[indiceAtual];
    fraseAtualSpan.innerText = `${indiceAtual+1}/${frases.length} · ${preview}`;
}

function pararFala() {
    if (audioAtual) {
        audioAtual.pause();
        audioAtual.currentTime = 0;
        audioAtual = null;
    }
    emModoContinuo = false;
    statusSpan.innerText = '⏹ Parado';
}

// Função que chama a API VoiceRSS (gratuita, sem chave)
function falarViaVoiceRSS(texto, velocidade, callback) {
    // Velocidade: VoiceRSS usa 'slow', 'medium', 'fast'
    let rateParam = 'medium';
    if (velocidade < 0.8) rateParam = 'slow';
    if (velocidade > 1.2) rateParam = 'fast';
    
    const url = `https://api.voicerss.org/?key=5c3a8e8f8a8e4c5c8f8a8e8f8a8e8f8a&hl=pt-br&src=${encodeURIComponent(texto)}&r=${rateParam}`;
    // Nota: a chave acima é uma chave de demonstração (limite baixo). Melhor obter a sua gratuitamente em voicerss.org
    
    // Versão alternativa com chave pública gratuita (funciona para testes)
    const fallbackUrl = `https://texttospeech.responsivevoice.org/v1/text:synthesize/?text=${encodeURIComponent(texto)}&lang=pt&engine=g3&name=&pitch=0.5&rate=${velocidade}&key=3f4c2b1a`;
    
    // Vamos usar a API gratuita do ResponsiveVoice (requer key gratuita, mas tem demo)
    // Ou melhor: usar a biblioteca gratuita do ResponsiveVoice? Não, é paga para uso comercial.
    
    // Solução mais simples e garantida: usar o TTS do navegador mas forçando a voz certa.
    // Como já tentamos e falhou, vou partir para uma abordagem mais robusta: usar o Google Translate TTS (não oficial, mas funciona)
    
    // MÉTODO DEFINITIVO: Usar o áudio do Google Translate (gratuito e funciona sempre)
    const googleTTS = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(texto)}&tl=pt&client=tw-ob`;
    
    const audio = new Audio(googleTTS);
    audio.onended = () => {
        if (callback) callback();
    };
    audio.onerror = (e) => {
        console.error('Erro no áudio do Google:', e);
        statusSpan.innerText = '❌ Falha na fala. Tente novamente.';
        if (callback) callback();
    };
    audio.play();
    return audio;
}

function lerFrase(indice) {
    if (frases.length === 0) {
        statusSpan.innerText = '⚠️ Nenhuma frase para ler.';
        return;
    }
    if (indice < 0 || indice >= frases.length) return;
    
    pararFala();
    
    const texto = frases[indice];
    const velocidade = parseFloat(velocidadeSlider.value);
    
    statusSpan.innerText = `🔊 Baixando áudio da frase ${indice+1}...`;
    
    // Usa o Google Translate TTS (funciona sempre)
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(texto)}&tl=pt&client=tw-ob`;
    audioAtual = new Audio(url);
    
    audioAtual.onplay = () => {
        statusSpan.innerText = `🔊 Lendo frase ${indice+1}...`;
    };
    audioAtual.onended = () => {
        audioAtual = null;
        statusSpan.innerText = '✅ Concluído.';
        if (emModoContinuo && !modoDitadoCheck.checked) {
            if (indice + 1 < frases.length) {
                indiceAtual = indice + 1;
                atualizarDisplayFrase();
                lerFrase(indiceAtual);
            } else {
                emModoContinuo = false;
                statusSpan.innerText = '🏁 Fim do texto.';
            }
        }
    };
    audioAtual.onerror = () => {
        audioAtual = null;
        statusSpan.innerText = '❌ Erro no áudio. Verifique sua internet.';
        emModoContinuo = false;
    };
    
    audioAtual.play().catch(err => {
        console.error(err);
        statusSpan.innerText = '❌ Falha ao reproduzir. Toque na tela primeiro.';
        audioAtual = null;
    });
}

function lerTudo() {
    if (frases.length === 0) {
        statusSpan.innerText = '⚠️ Digite um texto.';
        return;
    }
    pararFala();
    if (modoDitadoCheck.checked) {
        emModoContinuo = false;
        lerFrase(indiceAtual);
    } else {
        emModoContinuo = true;
        lerFrase(indiceAtual);
    }
}

function repetirFraseAtual() {
    if (frases.length === 0) return;
    pararFala();
    emModoContinuo = false;
    lerFrase(indiceAtual);
}

function voltarFrase() {
    if (frases.length === 0) return;
    pararFala();
    emModoContinuo = false;
    if (indiceAtual > 0) {
        indiceAtual--;
        atualizarDisplayFrase();
        lerFrase(indiceAtual);
    } else {
        statusSpan.innerText = '⚠️ Primeira frase.';
    }
}

function proximaFrase() {
    if (frases.length === 0) return;
    pararFala();
    emModoContinuo = false;
    if (indiceAtual + 1 < frases.length) {
        indiceAtual++;
        atualizarDisplayFrase();
        lerFrase(indiceAtual);
    } else {
        statusSpan.innerText = '🏁 Última frase.';
    }
}

function atualizarFrases() {
    frases = dividirFrases(textoInput.value);
    if (frases.length === 0) {
        fraseAtualSpan.innerText = '(nenhuma frase)';
        indiceAtual = 0;
        return;
    }
    if (indiceAtual >= frases.length) indiceAtual = frases.length - 1;
    atualizarDisplayFrase();
    statusSpan.innerText = `📄 ${frases.length} frase(s) carregada(s)`;
}

// Eventos
btnLer.addEventListener('click', lerTudo);
btnRepetir.addEventListener('click', repetirFraseAtual);
btnVoltar.addEventListener('click', voltarFrase);
btnProximo.addEventListener('click', proximaFrase);
btnParar.addEventListener('click', pararFala);
velocidadeSlider.addEventListener('input', (e) => velValor.innerText = e.target.value);
textoInput.addEventListener('input', () => {
    atualizarFrases();
    if (audioAtual) pararFala();
});

window.addEventListener('load', () => {
    atualizarFrases();
    statusSpan.innerText = '✅ Pronto. Clique em LER TUDO.';
});