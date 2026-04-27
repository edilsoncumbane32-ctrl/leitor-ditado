// ==================== SPEECH CONTROLLER ====================
const SpeechController = {
    synth: window.speechSynthesis,
    isSpeaking: false,

    // Método principal: fala um texto e retorna Promise quando termina
    async speak(text, rate = 1.0) {
        if (!this.synth) {
            throw new Error("Speech synthesis not supported");
        }
        // Limpa qualquer fala pendente (evita fila travada)
        this.synth.cancel();
        this.isSpeaking = false;

        return new Promise((resolve, reject) => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'pt-BR';   // Português do Brasil
            utterance.rate = rate;
            utterance.pitch = 1;
            utterance.volume = 1;

            utterance.onstart = () => {
                this.isSpeaking = true;
            };
            utterance.onend = () => {
                this.isSpeaking = false;
                resolve();
            };
            utterance.onerror = (err) => {
                this.isSpeaking = false;
                reject(err);
            };

            this.synth.speak(utterance);
        });
    },

    // Para imediatamente
    stop() {
        if (this.synth) {
            this.synth.cancel();
        }
        this.isSpeaking = false;
    },

    // Força o motor a "acordar" (útil no WebView)
    wakeUp() {
        if (!this.synth) return;
        const silent = new SpeechSynthesisUtterance('');
        silent.lang = 'pt-BR';
        this.synth.speak(silent);
        setTimeout(() => this.synth.cancel(), 100);
    }
};

// ==================== ELEMENTOS DOM ====================
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

// ==================== VARIÁVEIS GLOBAIS ====================
let frases = [];
let indiceAtual = 0;
let emModoContinuo = false;   // Se true, lê automaticamente a próxima frase
let estaEsperando = false;    // Bloqueia novos comandos enquanto fala

// ==================== FUNÇÕES AUXILIARES ====================
function dividirFrases(texto) {
    texto = texto.replace(/\s+/g, ' ').trim();
    if (!texto) return [];
    // Divide por . ! ? seguidos de espaço (ou fim de string)
    return texto.split(/(?<=[.!?])\s+/).filter(f => f.length > 0);
}

function atualizarDisplayFrase() {
    if (frases.length === 0) {
        fraseAtualSpan.innerText = '(nenhuma frase)';
        return;
    }
    let preview = frases[indiceAtual];
    if (preview.length > 80) preview = preview.substring(0, 80) + '…';
    fraseAtualSpan.innerText = `${indiceAtual+1}/${frases.length} · ${preview}`;
    statusSpan.innerText = `📌 Frase ${indiceAtual+1} de ${frases.length} - Pronto`;
}

function atualizarFrases() {
    frases = dividirFrases(textoInput.value);
    if (frases.length === 0) {
        fraseAtualSpan.innerText = '(nenhuma frase)';
        indiceAtual = 0;
        statusSpan.innerText = '⚠️ Digite um texto.';
        return;
    }
    if (indiceAtual >= frases.length) indiceAtual = frases.length - 1;
    if (indiceAtual < 0) indiceAtual = 0;
    atualizarDisplayFrase();
}

// ==================== LEITURA DE UMA FRASE (COM QUEUE) ====================
async function lerFrase(indice) {
    if (estaEsperando) {
        statusSpan.innerText = '⏳ Aguarde, ainda falando...';
        return;
    }
    if (frases.length === 0) {
        statusSpan.innerText = '⚠️ Nenhuma frase para ler.';
        return;
    }
    if (indice < 0 || indice >= frases.length) return;

    // Para qualquer leitura anterior
    SpeechController.stop();
    estaEsperando = true;

    const frase = frases[indice];
    const velocidade = parseFloat(velocidadeSlider.value);
    statusSpan.innerText = `🔊 Lendo frase ${indice+1}...`;

    try {
        await SpeechController.speak(frase, velocidade);
        // Quando termina
        statusSpan.innerText = '✅ Leitura concluída.';
        
        if (emModoContinuo && !modoDitadoCheck.checked) {
            // Avança automaticamente se não estiver no modo ditado
            if (indice + 1 < frases.length) {
                indiceAtual = indice + 1;
                atualizarDisplayFrase();
                // Pequeno delay para evitar loop muito rápido
                setTimeout(() => lerFrase(indiceAtual), 100);
            } else {
                emModoContinuo = false;
                statusSpan.innerText = '🏁 Fim do texto.';
            }
        }
    } catch (err) {
        console.error('Erro no speak:', err);
        statusSpan.innerText = '❌ Falha ao falar. Toque na tela e tente novamente.';
        // Tenta acordar o motor novamente
        SpeechController.wakeUp();
    } finally {
        estaEsperando = false;
    }
}

// ==================== AÇÕES DOS BOTÕES ====================
function lerTudo() {
    if (frases.length === 0) {
        statusSpan.innerText = '⚠️ Digite um texto antes.';
        return;
    }
    // Interrompe o que estiver rodando
    SpeechController.stop();
    estaEsperando = false;
    emModoContinuo = !modoDitadoCheck.checked; // Se ditado estiver marcado, NÃO continua automático
    lerFrase(indiceAtual);
}

function repetirFraseAtual() {
    if (frases.length === 0) return;
    SpeechController.stop();
    estaEsperando = false;
    emModoContinuo = false;
    lerFrase(indiceAtual);
}

function voltarFrase() {
    if (frases.length === 0) return;
    SpeechController.stop();
    estaEsperando = false;
    emModoContinuo = false;
    if (indiceAtual > 0) {
        indiceAtual--;
        atualizarDisplayFrase();
        lerFrase(indiceAtual);
    } else {
        statusSpan.innerText = '⚠️ Já está na primeira frase.';
    }
}

function proximaFrase() {
    if (frases.length === 0) return;
    SpeechController.stop();
    estaEsperando = false;
    emModoContinuo = false;
    if (indiceAtual + 1 < frases.length) {
        indiceAtual++;
        atualizarDisplayFrase();
        lerFrase(indiceAtual);
    } else {
        statusSpan.innerText = '🏁 Você já está na última frase.';
    }
}

function pararTudo() {
    SpeechController.stop();
    estaEsperando = false;
    emModoContinuo = false;
    statusSpan.innerText = '⏹ Leitura parada.';
}

// ==================== EVENT LISTENERS ====================
btnLer.addEventListener('click', lerTudo);
btnRepetir.addEventListener('click', repetirFraseAtual);
btnVoltar.addEventListener('click', voltarFrase);
btnProximo.addEventListener('click', proximaFrase);
btnParar.addEventListener('click', pararTudo);

velocidadeSlider.addEventListener('input', (e) => {
    velValor.innerText = e.target.value;
});

textoInput.addEventListener('input', () => {
    atualizarFrases();
    if (estaEsperando) pararTudo();
});

// ==================== INICIALIZAÇÃO ====================
window.addEventListener('load', () => {
    // Verifica suporte
    if (!window.speechSynthesis) {
        statusSpan.innerText = '❌ Seu navegador não suporta leitura em voz alta.';
        btnLer.disabled = true;
        btnRepetir.disabled = true;
        return;
    }
    // Acorda o motor de voz (fundamental para WebView)
    SpeechController.wakeUp();
    atualizarFrases();
    statusSpan.innerText = '✅ App pronto. Clique em "LER TUDO". Toque uma vez na tela se necessário.';
});