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
let utteranceQueue = []; // Array global para evitar Garbage Collection

// Inicializa o TTS e garante que as vozes estejam carregadas
function inicializarTTS() {
    return new Promise((resolve) => {
        if (window.speechSynthesis.getVoices().length > 0) {
            return resolve();
        }
        window.speechSynthesis.onvoiceschanged = () => resolve();
    });
}

// Divide o texto em frases
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
    emModoContinuo = false;
    utteranceQueue = [];
    statusSpan.innerText = '⏹ Parado';
}

function lerFrase(indice) {
    if (frases.length === 0) {
        statusSpan.innerText = '⚠️ Nenhuma frase para ler.';
        return;
    }
    if (indice < 0 || indice >= frases.length) return;
    
    pararFala();

    // Pequeno delay para garantir que a fala anterior foi cancelada
    setTimeout(async () => {
        await inicializarTTS();

        const frase = frases[indice];
        const velocidade = parseFloat(velocidadeSlider.value);
        const utterance = new SpeechSynthesisUtterance(frase);
        
        utterance.lang = 'pt-BR';
        utterance.rate = velocidade;
        utterance.pitch = 1;
        utterance.volume = 1;

        // SELECIONA UMA VOZ LOCAL PARA EVITAR O BUG DO CHROME
        const voices = window.speechSynthesis.getVoices();
        // Tenta encontrar uma voz em português que seja local
        let selectedVoice = voices.find(v => v.lang.includes('pt') && v.localService === true);
        // Se não encontrar, tenta qualquer voz local em português
        if (!selectedVoice) selectedVoice = voices.find(v => v.lang.includes('pt'));
        // Se ainda assim não encontrar, usa a primeira voz local disponível
        if (!selectedVoice) selectedVoice = voices.find(v => v.localService === true);
        
        if (selectedVoice) {
            utterance.voice = selectedVoice;
            console.log(`Usando voz: ${selectedVoice.name} (Local: ${selectedVoice.localService})`);
        } else {
            console.warn("Nenhuma voz local encontrada. Usando a voz padrão.");
        }

        utterance.onstart = () => {
            statusSpan.innerText = `🔊 Lendo frase ${indice+1}...`;
        };
        utterance.onend = () => {
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
            console.error("Erro detalhado:", e);
            statusSpan.innerText = `❌ Erro: ${e.error || 'Falha na leitura'}. Tente novamente.`;
            emModoContinuo = false;
        };

        utteranceQueue.push(utterance);
        window.speechSynthesis.speak(utterance);
    }, 100);
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

// Event Listeners
btnLer.addEventListener('click', lerTudo);
btnRepetir.addEventListener('click', repetirFraseAtual);
btnVoltar.addEventListener('click', voltarFrase);
btnProximo.addEventListener('click', proximaFrase);
btnParar.addEventListener('click', pararFala);
velocidadeSlider.addEventListener('input', (e) => velValor.innerText = e.target.value);
textoInput.addEventListener('input', () => {
    atualizarFrases();
    if (window.speechSynthesis && window.speechSynthesis.speaking) pararFala();
});

// Inicialização
window.addEventListener('load', async () => {
    atualizarFrases();
    if (!window.speechSynthesis) {
        statusSpan.innerText = '❌ Navegador sem suporte.';
        btnLer.disabled = true;
    } else {
        await inicializarTTS();
        statusSpan.innerText = '✅ Pronto. Clique em LER TUDO.';
    }
});