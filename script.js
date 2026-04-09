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
        statusSpan.innerText = '❌ Navegador sem suporte a síntese de voz.';
        return false;
    }
    if (frases.length === 0) {
        statusSpan.innerText = '⚠️ Nenhuma frase para ler.';
        return false;
    }
    if (indice < 0 || indice >= frases.length) {
        statusSpan.innerText = '⚠️ Índice inválido.';
        return false;
    }
    
    pararFala();
    
    // Pequeno delay para garantir que a fala anterior foi cancelada
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
            statusSpan.innerText = '✅ Leitura concluída.';
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
            statusSpan.innerText = '❌ Erro na leitura. Tente novamente.';
        };
        
        window.speechSynthesis.speak(utterance);
    }, 50);
}

function lerTudo() {
    if (frases.length === 0) {
        statusSpan.innerText = '⚠️ Digite um texto primeiro.';
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
    if (falando) pararFala();
});

window.addEventListener('load', () => {
    atualizarFrases();
    // Verifica se a síntese está disponível
    if (!window.speechSynthesis) {
        statusSpan.innerText = '❌ Seu navegador não suporta leitura em voz alta.';
        btnLer.disabled = true;
    } else {
        statusSpan.innerText = '✅ Pronto. Clique em LER TUDO.';
    }
});
