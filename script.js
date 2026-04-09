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

// Variáveis de controle
let frases = [];
let indiceAtual = 0;
let falando = false;
let utteranceAtual = null;
let emModoContinuo = false;

// Divide o texto em frases
function dividirFrases(texto) {
    texto = texto.replace(/\s+/g, ' ').trim();
    let frasesTemp = texto.split(/(?<=[.!?])\s+/);
    return frasesTemp.filter(f => f.length > 0);
}

function atualizarDisplayFrase() {
    if (frases.length === 0) {
        fraseAtualSpan.innerText = '(nenhuma frase)';
        return;
    }
    if (indiceAtual >= 0 && indiceAtual < frases.length) {
        let frasePreview = frases[indiceAtual].length > 80 
            ? frases[indiceAtual].substring(0, 80) + '…' 
            : frases[indiceAtual];
        fraseAtualSpan.innerText = `${indiceAtual+1}/${frases.length} · ${frasePreview}`;
    } else {
        fraseAtualSpan.innerText = 'Índice inválido';
    }
}

function pararFala() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    falando = false;
    emModoContinuo = false;
    utteranceAtual = null;
    statusSpan.innerText = '⏹ Parado';
}

function lerFrase(indice) {
    if (!window.speechSynthesis) {
        statusSpan.innerText = '❌ Seu navegador não suporta leitura em voz alta.';
        return false;
    }
    
    if (frases.length === 0) {
        statusSpan.innerText = '⚠️ Nenhuma frase para ler. Digite um texto primeiro.';
        return false;
    }
    
    if (indice < 0 || indice >= frases.length) {
        statusSpan.innerText = '⚠️ Índice de frase inválido.';
        return false;
    }
    
    pararFala();
    
    const frase = frases[indice];
    const velocidade = parseFloat(velocidadeSlider.value);
    
    const utterance = new SpeechSynthesisUtterance(frase);
    utterance.lang = 'pt-BR';
    utterance.rate = velocidade;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => {
        falando = true;
        statusSpan.innerText = `🔊 Lendo frase ${indice+1}...`;
    };
    
    utterance.onend = () => {
        falando = false;
        utteranceAtual = null;
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
        } else {
            emModoContinuo = false;
        }
    };
    
    utterance.onerror = (e) => {
        console.error('Erro na síntese:', e);
        falando = false;
        emModoContinuo = false;
        statusSpan.innerText = '❌ Erro na leitura.';
    };
    
    utteranceAtual = utterance;
    window.speechSynthesis.speak(utterance);
    return true;
}

function lerTudo() {
    if (frases.length === 0) {
        statusSpan.innerText = '⚠️ Não há frases. Digite algo e clique fora do campo para atualizar.';
        return;
    }
    
    pararFala();
    
    if (modoDitadoCheck.checked) {
        emModoContinuo = false;
        lerFrase(indiceAtual);
        statusSpan.innerText = `🎤 Modo ditado: frase ${indiceAtual+1}. Clique em "Próximo" para avançar.`;
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
    statusSpan.innerText = `🔁 Repetindo frase ${indiceAtual+1}`;
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
        statusSpan.innerText = '⚠️ Já está na primeira frase.';
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
        if (modoDitadoCheck.checked) {
            statusSpan.innerText = `🎤 Modo ditado: frase ${indiceAtual+1}. Clique em "Próximo" novamente.`;
        }
    } else {
        statusSpan.innerText = '🏁 Você já está na última frase.';
    }
}

function atualizarFrases() {
    const texto = textoInput.value;
    frases = dividirFrases(texto);
    if (frases.length === 0) {
        fraseAtualSpan.innerText = '(nenhuma frase)';
        indiceAtual = 0;
        return;
    }
    if (indiceAtual >= frases.length) indiceAtual = frases.length - 1;
    if (indiceAtual < 0) indiceAtual = 0;
    atualizarDisplayFrase();
    statusSpan.innerText = `📄 Texto atualizado: ${frases.length} frase(s)`;
}

// Eventos
btnLer.addEventListener('click', lerTudo);
btnRepetir.addEventListener('click', repetirFraseAtual);
btnVoltar.addEventListener('click', voltarFrase);
btnProximo.addEventListener('click', proximaFrase);
btnParar.addEventListener('click', () => {
    pararFala();
    statusSpan.innerText = 'Leitura interrompida.';
});

velocidadeSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    velValor.innerText = val;
});

textoInput.addEventListener('input', () => {
    atualizarFrases();
    if (falando) pararFala();
});

window.addEventListener('load', () => {
    atualizarFrases();
    if (!window.speechSynthesis) {
        statusSpan.innerText = '❌ Navegador sem suporte. Use Chrome/Edge/Android WebView.';
        btnLer.disabled = true;
        btnRepetir.disabled = true;
    }
});
