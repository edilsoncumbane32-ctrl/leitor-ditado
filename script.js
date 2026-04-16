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

// Função para dividir texto em frases
function dividirFrases(texto) {
    texto = texto.replace(/\s+/g, ' ').trim();
    if (!texto) return [];
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

// Função principal de fala usando Google Translate TTS (funciona SEMPRE)
function falarTexto(texto, velocidade, callback) {
    // Ajuste de velocidade: o Google Translate não aceita velocidade diretamente, então usamos um parâmetro de pitch aproximado
    // Para simplificar, usamos a URL padrão (velocidade normal)
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(texto)}&tl=pt&client=tw-ob`;
    
    const audio = new Audio(url);
    audio.onended = () => {
        if (callback) callback();
    };
    audio.onerror = (err) => {
        console.error('Erro no áudio:', err);
        statusSpan.innerText = '❌ Erro no áudio. Verifique sua internet.';
        if (callback) callback();
    };
    audio.play().catch(e => {
        console.error('Play falhou:', e);
        statusSpan.innerText = '❌ Falha ao reproduzir. Toque na tela e tente novamente.';
    });
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
    statusSpan.innerText = `🔊 Carregando áudio da frase ${indice+1}...`;
    
    audioAtual = falarTexto(texto, velocidadeSlider.value, () => {
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
    statusSpan.innerText = `📄 ${frases.length} frase(s) carregada(s). Toque em LER TUDO.`;
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

// Inicialização
window.addEventListener('load', () => {
    atualizarFrases();
    statusSpan.innerText = '✅ App pronto. Clique em LER TUDO.';
});