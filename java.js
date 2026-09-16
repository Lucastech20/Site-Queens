/* ==========================================
   Queens — Lógica do Jogo
   ========================================== */

// ---- Estado global ----
let tamanho = 8;
let estadoCelulas = [];   // 0=vazio, 1=X, 2=rainha
let jogoAtivo = false;
let jogoCompleto = false;
let timerInterval = null;
let segundos = 0;

// ---- Elementos (podem ser null em páginas sem tabuleiro) ----
const boardElement     = document.getElementById('board');
const statusEl         = document.getElementById('gameStatus');
const countRainhasEl   = document.getElementById('countRainhas');
const countMetaEl      = document.getElementById('countMeta');
const timerEl          = document.getElementById('timerDisplay');
const modalEl          = document.getElementById('modalVitoria');
const modalMsgEl       = document.getElementById('modalMensagem');

// ---- Inicializa só se o tabuleiro existir na página ----
if (boardElement) {
    inicializar(tamanho);
}

/* ==========================================
   INICIALIZAÇÃO
   ========================================== */
function inicializar(n) {
    tamanho = n;
    estadoCelulas = Array(n * n).fill(0);
    jogoCompleto = false;
    jogoAtivo = false;

    // Ajusta variáveis CSS para o tamanho do tabuleiro
    const cellSize = Math.min(Math.floor(Math.min(window.innerWidth - 60, 520) / n), 64);
    boardElement.style.setProperty('--cols', n);
    boardElement.style.setProperty('--cell-size', cellSize + 'px');

    if (countMetaEl) countMetaEl.textContent = n;
    atualizarContador();
    atualizarStatus('👑 Posicione ' + n + ' rainhas sem conflitos!', '');

    pararTimer();
    segundos = 0;
    atualizarTimer();

    criarTabuleiro();
}

/* ==========================================
   TABULEIRO
   ========================================== */
function criarTabuleiro() {
    boardElement.innerHTML = '';

    for (let i = 0; i < tamanho * tamanho; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.dataset.index = i;

        renderCelula(cell, estadoCelulas[i]);

        cell.addEventListener('click', () => clicarCelula(i));

        boardElement.appendChild(cell);
    }
}

function renderCelula(el, valor) {
    el.textContent = '';
    el.classList.remove('tem-rainha', 'invalida', 'valida');

    if (valor === 1) {
        el.textContent = '❌';
    } else if (valor === 2) {
        el.textContent = '👑';
        el.classList.add('tem-rainha');
    }
}

/* ==========================================
   INTERAÇÃO
   ========================================== */
function clicarCelula(idx) {
    if (jogoCompleto) return;

    // Inicia o timer na primeira jogada
    if (!jogoAtivo) {
        jogoAtivo = true;
        iniciarTimer();
    }

    // Ciclo: 0 → 1 → 2 → 0
    estadoCelulas[idx] = (estadoCelulas[idx] + 1) % 3;

    // Re-renderiza tudo (valida conflitos)
    atualizarTabuleiro();
}

function atualizarTabuleiro() {
    const conflitos = calcularConflitos();
    const cells = boardElement.querySelectorAll('.cell');
    let totalRainhas = 0;

    cells.forEach((cell, i) => {
        renderCelula(cell, estadoCelulas[i]);

        if (estadoCelulas[i] === 2) {
            totalRainhas++;
            if (conflitos.has(i)) {
                cell.classList.add('invalida');
                cell.classList.remove('tem-rainha');
            }
        }
    });

    atualizarContador(totalRainhas);

    if (conflitos.size > 0) {
        atualizarStatus('⚠️ Conflito detectado! Verifique as posições em vermelho.', 'erro');
    } else if (totalRainhas === tamanho) {
        // Vitória!
        jogoCompleto = true;
        pararTimer();
        atualizarStatus('✅ Parabéns! Você resolveu o puzzle!', 'sucesso');

        // Marca todas as rainhas como válidas
        cells.forEach((cell, i) => {
            if (estadoCelulas[i] === 2) cell.classList.add('valida');
        });

        setTimeout(() => {
            dispararConfete();
            if (modalEl && modalMsgEl) {
                modalMsgEl.textContent = `Resolvido em ${formatarTempo(segundos)} com ${tamanho} rainhas!`;
                modalEl.classList.add('ativo');
            }
        }, 400);

    } else if (totalRainhas > 0) {
        atualizarStatus(`👑 ${totalRainhas} de ${tamanho} rainhas posicionadas — sem conflitos.`, '');
    } else {
        atualizarStatus(`👑 Posicione ${tamanho} rainhas sem conflitos!`, '');
    }
}

/* ==========================================
   VALIDAÇÃO DE CONFLITOS
   ========================================== */
function calcularConflitos() {
    const conflitos = new Set();
    const rainhas = [];

    for (let i = 0; i < estadoCelulas.length; i++) {
        if (estadoCelulas[i] === 2) {
            rainhas.push({ idx: i, row: Math.floor(i / tamanho), col: i % tamanho });
        }
    }

    for (let a = 0; a < rainhas.length; a++) {
        for (let b = a + 1; b < rainhas.length; b++) {
            const r1 = rainhas[a];
            const r2 = rainhas[b];

            // Mesma linha
            if (r1.row === r2.row) {
                conflitos.add(r1.idx);
                conflitos.add(r2.idx);
            }

            // Mesma coluna
            if (r1.col === r2.col) {
                conflitos.add(r1.idx);
                conflitos.add(r2.idx);
            }

            // Diagonal (qualquer distância)
            if (Math.abs(r1.row - r2.row) === Math.abs(r1.col - r2.col)) {
                conflitos.add(r1.idx);
                conflitos.add(r2.idx);
            }

            // Adjacência (células vizinhas — regra do Queens LinkedIn)
            if (Math.abs(r1.row - r2.row) <= 1 && Math.abs(r1.col - r2.col) <= 1) {
                conflitos.add(r1.idx);
                conflitos.add(r2.idx);
            }
        }
    }

    return conflitos;
}

/* ==========================================
   DICA
   ========================================== */
function darDica() {
    if (jogoCompleto) return;

    // Tenta encontrar uma posição válida para mais uma rainha
    const rainhasAtuais = [];
    for (let i = 0; i < estadoCelulas.length; i++) {
        if (estadoCelulas[i] === 2) {
            rainhasAtuais.push({ row: Math.floor(i / tamanho), col: i % tamanho });
        }
    }

    for (let row = 0; row < tamanho; row++) {
        // Verifica se já tem rainha nesta linha
        if (rainhasAtuais.some(r => r.row === row)) continue;

        for (let col = 0; col < tamanho; col++) {
            const idx = row * tamanho + col;
            if (estadoCelulas[idx] !== 0) continue;

            // Testa se essa posição é segura
            const nova = { row, col };
            const segura = rainhasAtuais.every(r =>
                r.row !== nova.row &&
                r.col !== nova.col &&
                Math.abs(r.row - nova.row) !== Math.abs(r.col - nova.col) &&
                !(Math.abs(r.row - nova.row) <= 1 && Math.abs(r.col - nova.col) <= 1)
            );

            if (segura) {
                // Anima a célula dica
                const cell = boardElement.querySelectorAll('.cell')[idx];
                cell.style.boxShadow = '0 0 0 3px var(--cor-acento)';
                cell.style.transition = 'box-shadow 0.3s ease';
                setTimeout(() => { cell.style.boxShadow = ''; }, 2000);
                atualizarStatus('💡 Dica: Uma posição válida foi destacada!', '');
                return;
            }
        }
    }

    atualizarStatus('🤔 Nenhuma dica simples disponível. Tente reorganizar as rainhas.', '');
}

/* ==========================================
   CONTROLES
   ========================================== */
function reiniciarTabuleiro() {
    inicializar(tamanho);
}

function mudarTamanho(n) {
    // Atualiza botões de aba
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('ativo', parseInt(btn.dataset.size) === n);
    });

    inicializar(n);
}

/* ==========================================
   TIMER
   ========================================== */
function iniciarTimer() {
    timerInterval = setInterval(() => {
        segundos++;
        atualizarTimer();
    }, 1000);
}

function pararTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function atualizarTimer() {
    if (timerEl) timerEl.textContent = formatarTempo(segundos);
}

function formatarTempo(s) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const seg = (s % 60).toString().padStart(2, '0');
    return `${m}:${seg}`;
}

/* ==========================================
   MODAL
   ========================================== */
function fecharModal() {
    if (modalEl) modalEl.classList.remove('ativo');
}

// Fecha ao clicar fora do modal
if (modalEl) {
    modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) fecharModal();
    });
}

/* ==========================================
   CONFETE
   ========================================== */
function dispararConfete() {
    const cores = ['#7c3aed', '#a78bfa', '#f59e0b', '#10b981', '#ef4444', '#60a5fa', '#fff'];
    const total = 60;

    for (let i = 0; i < total; i++) {
        setTimeout(() => {
            const confete = document.createElement('div');
            confete.classList.add('confete');
            confete.style.left = Math.random() * 100 + 'vw';
            confete.style.top = '-20px';
            confete.style.background = cores[Math.floor(Math.random() * cores.length)];
            confete.style.width  = (6 + Math.random() * 8) + 'px';
            confete.style.height = (6 + Math.random() * 8) + 'px';
            confete.style.animationDuration = (1.5 + Math.random() * 2) + 's';
            confete.style.animationDelay = '0s';
            document.body.appendChild(confete);
            setTimeout(() => confete.remove(), 4000);
        }, i * 40);
    }
}

/* ==========================================
   UI HELPERS
   ========================================== */
function atualizarContador(total) {
    if (countRainhasEl) countRainhasEl.textContent = total ?? estadoCelulas.filter(v => v === 2).length;
}

function atualizarStatus(msg, tipo) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = 'game-status';
    if (tipo) statusEl.classList.add(tipo);
}

/* ==========================================
   DESTACAR LINK ATIVO NO NAV
   ========================================== */
(function marcarNavAtivo() {
    const pagina = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('nav ul li a').forEach(link => {
        const href = link.getAttribute('href');
        if (href === pagina) {
            link.classList.add('ativo');
        }
    });
})();
