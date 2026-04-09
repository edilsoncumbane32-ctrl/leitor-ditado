// Elementos
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
let falando = false;
let emModoContinuo = false;
let ttsReady = false;

// Inicializa o TTS (chamado no primeiro toque)
function initTTS() {
    if (!ttsReady && window.speechSynthesis) {
        // Força o carregamento do mecanismo de voz com um utterance vazio
        const utterance = new SpeechSynthesisUtterance('');
        utterance.lang = 'pt-BR';
        window.speechSynthesis.speak(utterance);
        window.speechSynthesis.cancel();
        ttsReady = true;
        statusSpan.innerText = '✅ Áudio ativado. Pronto para ler.';
    }
}

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
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    falando = false;
    emModoContinuo = false;
    statusSpan.innerText = '⏹ Parado';
}

function lerFrase(indice) {
    if (!window.speechSynthesis) {
        statusSpan.innerText = '❌ Navegador sem suporte.';
        return;
    }
    if (frases.length === 0) {
        statusSpan.innerText = '⚠️ Nenhuma frase.';
        return;
    }
    if (indice < 0 || indice >= frases.length) return;
    
    // Para qualquer fala anterior
    pararFala();
    
    // Garante que o TTS foi iniciado
    if (!ttsReady) initTTS();
    
    setTimeout(() => {
        const frase = frases[indice];
        const velocidade = parseFloat(velocidadeSlider.value);
        const utterance = new SpeechSynthesisUtterance(frase);
        utterance.lang = 'pt-BR';
        utterance.rate = velocidade;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        utterance.onstart = () => {
            falando = true;
            statusSpan.innerText = `🔊 Lendo frase ${indice+1}...`;
        };
        utterance.onend = () => {
            falando = false;
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
        utterance.onerror = (e) => {
            console.error(e);
            falando = false;
            emModoContinuo = false;
            statusSpan.innerText = '❌ Erro. Tente novamente.';
            // Tenta reiniciar o TTS
            ttsReady = false;
            initTTS();
        };
        
        window.speechSynthesis.speak(utterance);
    }, 50);
}

function lerTudo() {
    if (frases.length === 0) {
        statusSpan.innerText = '⚠️ Digite um texto.';
        return;
    }
    if (!ttsReady) initTTS();
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
    if (!ttsReady) initTTS();
    pararFala();
    emModoContinuo = false;
    lerFrase(indiceAtual);
}

function voltarFrase() {
    if (frases.length === 0) return;
    if (!ttsReady) initTTS();
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
    if (!ttsReady) initTTS();
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
    if (falando) pararFala();
});

// Ao carregar, prepara mas não ativa o TTS automaticamente
window.addEventListener('load', () => {
    atualizarFrases();
    if (!window.speechSynthesis) {
        statusSpan.innerText = '❌ Navegador sem suporte.';
        btnLer.disabled = true;
    } else {
        statusSpan.innerText = '✅ Toque em "LER TUDO" para ativar o áudio.';
        // Adiciona um listener de toque global para iniciar TTS no primeiro toque
        document.body.addEventListener('touchstart', function initOnce() {
            initTTS();
            document.body.removeEventListener('touchstart', initOnce);
        }, { once: true });
    }
});
