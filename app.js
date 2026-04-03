import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// =========================
// FIREBASE
// =========================
const firebaseConfig = {
  apiKey: "AIzaSyAyEth1yYCKhk--z321-_muWnuLmPoVfEg",
  authDomain: "quase-a.firebaseapp.com",
  projectId: "quase-a",
  storageBucket: "quase-a.firebasestorage.app",
  messagingSenderId: "955542986429",
  appId: "1:955542986429:web:e96a842814e22641f821d4",
  measurementId: "G-R6825KWJMG"
};

const app = initializeApp(firebaseConfig);

let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (error) {
  console.warn("Analytics não iniciado neste ambiente:", error);
}

const db = getFirestore(app);
const storage = getStorage(app);

// =========================
// CONFIG
// =========================
const COLLECTION_NAME = "quase-acidentes";
const PAGE_SIZE = 5;
const IMAGE_MAX_WIDTH = 1280;
const IMAGE_QUALITY = 0.72;
const IMAGE_MAX_BYTES = 850000;

// =========================
// ELEMENTOS
// =========================
const form = document.getElementById("formOcorrencia");
const lista = document.getElementById("lista");
const saveMsg = document.getElementById("saveMsg");

const dataRegistro = document.getElementById("dataRegistro");
const nomeColaborador = document.getElementById("nomeColaborador");
const setorArea = document.getElementById("setorArea");
const unidadeLocal = document.getElementById("unidadeLocal");

const categoriaOutrosCheck = document.getElementById("categoriaOutrosCheck");
const categoriaOutrosWrap = document.getElementById("categoriaOutrosWrap");
const categoriaOutrosTexto = document.getElementById("categoriaOutrosTexto");

const descricaoSituacao = document.getElementById("descricaoSituacao");
const tipoLesaoWrap = document.getElementById("tipoLesaoWrap");
const tipoLesao = document.getElementById("tipoLesao");

const fotoOcorrencia = document.getElementById("fotoOcorrencia");
const fotoPreviewWrap = document.getElementById("fotoPreviewWrap");
const fotoPreview = document.getElementById("fotoPreview");

const acaoTomadaWrap = document.getElementById("acaoTomadaWrap");
const acaoTomada = document.getElementById("acaoTomada");

const planoAcaoWrap = document.getElementById("planoAcaoWrap");
const responsavelAcao = document.getElementById("responsavelAcao");
const prazoConclusao = document.getElementById("prazoConclusao");

const responsavelVerificacao = document.getElementById("responsavelVerificacao");
const dataVerificacao = document.getElementById("dataVerificacao");
const observacoesFinais = document.getElementById("observacoesFinais");

const formTitle = document.getElementById("formTitle");
const formSubtitle = document.getElementById("formSubtitle");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const totalRegistrosEl = document.getElementById("totalRegistros");
const totalAbertosEl = document.getElementById("totalAbertos");
const totalRiscoAltoEl = document.getElementById("totalRiscoAlto");
const totalPlanoEl = document.getElementById("totalPlano");
const totalHojeEl = document.getElementById("totalHoje");
const ultimaAtualizacaoEl = document.getElementById("ultimaAtualizacao");

const filtroNomeEl = document.getElementById("filtroNome");
const filtroStatusEl = document.getElementById("filtroStatus");
const filtroDataInicioEl = document.getElementById("filtroDataInicio");
const filtroDataFimEl = document.getElementById("filtroDataFim");
const btnLimparFiltros = document.getElementById("btnLimparFiltros");
const btnVerMais = document.getElementById("btnVerMais");
const btnVerMenos = document.getElementById("btnVerMenos");

const detailsModal = document.getElementById("detailsModal");
const modalBody = document.getElementById("modalBody");
const modalTitle = document.getElementById("modalTitle");
const modalSubtitle = document.getElementById("modalSubtitle");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalEditBtn = document.getElementById("modalEditBtn");
const modalDeleteBtn = document.getElementById("modalDeleteBtn");

// =========================
// ESTADO
// =========================
let editingDocId = null;
let currentDocsCache = [];
let openedDocId = null;
let visibleCount = PAGE_SIZE;
let currentPhotoBase64 = "";
let currentUploadedPhotoURL = "";
let currentUploadedPhotoPath = "";

// =========================
// DATA E HORA
// =========================
function agoraLocalInput() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

dataRegistro.value = agoraLocalInput();

// =========================
// HELPERS
// =========================
function gerarId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setMensagem(msg, erro = false) {
  saveMsg.textContent = msg;
  saveMsg.className = erro ? "message-box error" : "message-box success";
}

function escapeHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatarDataHoraBR(valor) {
  if (!valor) return "--";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return String(valor).replace("T", " ");
  return data.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function formatarDataBR(valor) {
  if (!valor) return "--";
  const data = new Date(`${valor}T00:00:00`);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleDateString("pt-BR");
}

function formatarTimestamp(timestamp) {
  if (!timestamp) return "--";

  const data = typeof timestamp?.toDate === "function"
    ? timestamp.toDate()
    : new Date(timestamp);

  if (Number.isNaN(data.getTime())) return "--";

  return data.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function mesmaDataLocal(dataA, dataB) {
  const a = new Date(dataA);
  const b = new Date(dataB);

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function obterRadioSelecionado(name) {
  const selecionado = document.querySelector(`input[name="${name}"]:checked`);
  return selecionado ? selecionado.value : "";
}

function marcarRadio(name, valor) {
  document.querySelectorAll(`input[name="${name}"]`).forEach((radio) => {
    radio.checked = radio.value === valor;
  });
}

function limparRadio(name) {
  document.querySelectorAll(`input[name="${name}"]`).forEach((radio) => {
    radio.checked = false;
  });
}

function obterCategoriasSelecionadas() {
  return [...document.querySelectorAll('input[name="categoriaRisco"]:checked')].map((item) => item.value);
}

function marcarCategorias(valores = []) {
  document.querySelectorAll('input[name="categoriaRisco"]').forEach((checkbox) => {
    checkbox.checked = valores.includes(checkbox.value);
  });
}

function nivelRiscoAlto(dados) {
  const nivel = String(dados?.classificacao?.nivelRisco || "").toLowerCase();
  return nivel === "alto" || nivel === "crítico" || nivel === "critico";
}

function exibirPreviewFoto(src) {
  if (!src) {
    fotoPreviewWrap.classList.add("hidden");
    fotoPreview.removeAttribute("src");
    return;
  }

  fotoPreview.src = src;
  fotoPreviewWrap.classList.remove("hidden");
}

function atualizarCamposCondicionais() {
  const temOutros = categoriaOutrosCheck.checked;
  categoriaOutrosWrap.classList.toggle("hidden", !temOutros);
  if (!temOutros) categoriaOutrosTexto.value = "";

  const causaLesao = obterRadioSelecionado("poderiaCausarLesao");
  const mostrarTipoLesao = causaLesao === "Sim";
  tipoLesaoWrap.classList.toggle("hidden", !mostrarTipoLesao);
  if (!mostrarTipoLesao) tipoLesao.value = "";

  const acaoImediata = obterRadioSelecionado("acaoImediataRealizada");
  const mostrarAcao = acaoImediata === "Sim";
  acaoTomadaWrap.classList.toggle("hidden", !mostrarAcao);
  if (!mostrarAcao) acaoTomada.value = "";

  const planoAcao = obterRadioSelecionado("necessitaPlanoAcao");
  const mostrarPlano = planoAcao === "Sim";
  planoAcaoWrap.classList.toggle("hidden", !mostrarPlano);
  if (!mostrarPlano) {
    responsavelAcao.value = "";
    prazoConclusao.value = "";
  }
}

function montarDadosFormulario() {
  return {
    identificacao: {
      dataRegistro: dataRegistro.value,
      nomeColaborador: nomeColaborador.value.trim(),
      setorArea: setorArea.value,
      unidadeLocal: unidadeLocal.value.trim()
    },
    classificacao: {
      tipoOcorrencia: obterRadioSelecionado("tipoOcorrencia"),
      categoriasRisco: obterCategoriasSelecionadas(),
      categoriaOutrosTexto: categoriaOutrosTexto.value.trim(),
      nivelRisco: obterRadioSelecionado("nivelRisco")
    },
    descricao: {
      descricaoSituacao: descricaoSituacao.value.trim(),
      poderiaCausarLesao: obterRadioSelecionado("poderiaCausarLesao"),
      tipoLesao: tipoLesao.value.trim()
    },
    evidencias: {
      fotoURL: currentUploadedPhotoURL || "",
      fotoPath: currentUploadedPhotoPath || ""
    },
    acaoImediata: {
      realizada: obterRadioSelecionado("acaoImediataRealizada"),
      descricao: acaoTomada.value.trim()
    },
    planoAcao: {
      necessita: obterRadioSelecionado("necessitaPlanoAcao"),
      responsavel: responsavelAcao.value.trim(),
      prazoConclusao: prazoConclusao.value
    },
    acompanhamento: {
      statusOcorrencia: obterRadioSelecionado("statusOcorrencia"),
      responsavelVerificacao: responsavelVerificacao.value.trim(),
      dataVerificacao: dataVerificacao.value,
      observacoesFinais: observacoesFinais.value.trim()
    }
  };
}

function validarDados(dados) {
  if (!dados.identificacao.dataRegistro) return "Informe a data do registro.";
  if (!dados.identificacao.nomeColaborador) return "Informe o nome do colaborador.";
  if (!dados.identificacao.setorArea) return "Selecione o setor / área.";
  if (!dados.identificacao.unidadeLocal) return "Informe a unidade / local da ocorrência.";

  if (!dados.classificacao.tipoOcorrencia) return "Selecione o tipo de ocorrência.";
  if (!dados.classificacao.categoriasRisco.length) return "Selecione ao menos uma categoria de risco.";
  if (dados.classificacao.categoriasRisco.includes("Outros") && !dados.classificacao.categoriaOutrosTexto) {
    return "Descreva a categoria de risco em Outros.";
  }
  if (!dados.classificacao.nivelRisco) return "Selecione o nível de risco.";

  if (!dados.descricao.descricaoSituacao) return "Descreva a situação observada.";
  if (!dados.descricao.poderiaCausarLesao) return "Informe se a situação poderia causar lesão.";
  if (dados.descricao.poderiaCausarLesao === "Sim" && !dados.descricao.tipoLesao) {
    return "Descreva o tipo de lesão que poderia ocorrer.";
  }

  if (dados.acaoImediata.realizada === "Sim" && !dados.acaoImediata.descricao) {
    return "Descreva a ação imediata tomada.";
  }

  if (dados.planoAcao.necessita === "Sim") {
    if (!dados.planoAcao.responsavel) return "Informe o responsável pela ação.";
    if (!dados.planoAcao.prazoConclusao) return "Informe o prazo para conclusão.";
  }

  if (!dados.acompanhamento.statusOcorrencia) {
    return "Selecione o status da ocorrência.";
  }

  return "";
}
function atualizarModoFormulario() {
  const emEdicao = !!editingDocId;
  submitBtn.textContent = emEdicao ? "Atualizar registro" : "Salvar registro";
  cancelEditBtn.hidden = !emEdicao;
  formTitle.textContent = emEdicao ? "Editar registro" : "Novo registro";
  formSubtitle.textContent = emEdicao
    ? "Altere os dados do registro selecionado."
    : "Preencha os dados da ocorrência.";
}

function preencherFormulario(dados) {
  dataRegistro.value = dados?.identificacao?.dataRegistro || agoraLocalInput();
  nomeColaborador.value = dados?.identificacao?.nomeColaborador || "";
  setorArea.value = dados?.identificacao?.setorArea || "";
  unidadeLocal.value = dados?.identificacao?.unidadeLocal || "";

  marcarRadio("tipoOcorrencia", dados?.classificacao?.tipoOcorrencia || "");
  marcarCategorias(dados?.classificacao?.categoriasRisco || []);
  categoriaOutrosTexto.value = dados?.classificacao?.categoriaOutrosTexto || "";
  marcarRadio("nivelRisco", dados?.classificacao?.nivelRisco || "");

  descricaoSituacao.value = dados?.descricao?.descricaoSituacao || "";
  marcarRadio("poderiaCausarLesao", dados?.descricao?.poderiaCausarLesao || "");
  tipoLesao.value = dados?.descricao?.tipoLesao || "";

  marcarRadio("acaoImediataRealizada", dados?.acaoImediata?.realizada || "");
  acaoTomada.value = dados?.acaoImediata?.descricao || "";

  marcarRadio("necessitaPlanoAcao", dados?.planoAcao?.necessita || "");
  responsavelAcao.value = dados?.planoAcao?.responsavel || "";
  prazoConclusao.value = dados?.planoAcao?.prazoConclusao || "";

  marcarRadio("statusOcorrencia", dados?.acompanhamento?.statusOcorrencia || "");
  responsavelVerificacao.value = dados?.acompanhamento?.responsavelVerificacao || "";
  dataVerificacao.value = dados?.acompanhamento?.dataVerificacao || "";
  observacoesFinais.value = dados?.acompanhamento?.observacoesFinais || "";

  currentPhotoBase64 = "";
  currentUploadedPhotoURL = dados?.evidencias?.fotoURL || "";
  currentUploadedPhotoPath = dados?.evidencias?.fotoPath || "";

  fotoOcorrencia.value = "";
  exibirPreviewFoto(currentUploadedPhotoURL);
  atualizarCamposCondicionais();
}

function limparFormulario() {
  form.reset();
  dataRegistro.value = agoraLocalInput();

  editingDocId = null;
  currentPhotoBase64 = "";
  currentUploadedPhotoURL = "";
  currentUploadedPhotoPath = "";

  limparRadio("tipoOcorrencia");
  limparRadio("nivelRisco");
  limparRadio("poderiaCausarLesao");
  limparRadio("acaoImediataRealizada");
  limparRadio("necessitaPlanoAcao");
  limparRadio("statusOcorrencia");

  document.querySelectorAll('input[name="categoriaRisco"]').forEach((checkbox) => {
    checkbox.checked = false;
  });

  exibirPreviewFoto("");
  atualizarCamposCondicionais();
  atualizarModoFormulario();
  setMensagem("Sistema pronto para uso.");
}

function getRegistrosFiltrados() {
  const nome = filtroNomeEl.value.trim().toLowerCase();
  const status = filtroStatusEl.value;
  const dataInicio = filtroDataInicioEl.value;
  const dataFim = filtroDataFimEl.value;

  return currentDocsCache.filter((item) => {
    const nomeOk = !nome || String(item?.identificacao?.nomeColaborador || "").toLowerCase().includes(nome);
    const statusOk = !status || item?.acompanhamento?.statusOcorrencia === status;

    const dataBase = item?.identificacao?.dataRegistro || "";
    const dataISO = dataBase ? dataBase.slice(0, 10) : "";

    const inicioOk = !dataInicio || (dataISO && dataISO >= dataInicio);
    const fimOk = !dataFim || (dataISO && dataISO <= dataFim);

    return nomeOk && statusOk && inicioOk && fimOk;
  });
}

function montarCard(dados) {
  const nome = dados?.identificacao?.nomeColaborador || "--";
  const data = dados?.identificacao?.dataRegistro || "";
  const setor = dados?.identificacao?.setorArea || "--";
  const status = dados?.acompanhamento?.statusOcorrencia || "--";
  const nivel = dados?.classificacao?.nivelRisco || "--";

  let chipStatus = `<span class="alert-chip">${escapeHtml(status)}</span>`;

  if (String(status).toLowerCase() === "concluído" || String(status).toLowerCase() === "concluido") {
    chipStatus = `<span class="done-chip">✅ ${escapeHtml(status)}</span>`;
  } else if (nivelRiscoAlto(dados)) {
    chipStatus = `<span class="risk-chip">🚨 ${escapeHtml(nivel)}</span>`;
  }

  return `
    <article class="status-card" data-open-id="${escapeHtml(dados.__docId)}">
      <div class="status-card-mini-content">
        <div>
          <h3 class="status-card-title">${escapeHtml(nome)}</h3>
          <p class="status-card-subtitle">
            ${escapeHtml(setor)} • ${formatarDataHoraBR(data)} • ${escapeHtml(nivel)}
          </p>
        </div>

        <div class="status-card-mini-content">
          <span class="card-date">${formatarTimestamp(dados.atualizadoEm || dados.criadoEm)}</span>
          ${chipStatus}
        </div>
      </div>
    </article>
  `;
}

function renderizarLista() {
  const filtrados = getRegistrosFiltrados();
  const exibidos = filtrados.slice(0, visibleCount);

  lista.innerHTML = "";

  if (!filtrados.length) {
    lista.innerHTML = `
      <li class="empty-state">
        <strong>Nenhum registro encontrado.</strong>
        <span>Tente ajustar os filtros ou criar um novo registro.</span>
      </li>
    `;
    return;
  }

  exibidos.forEach((dados) => {
    const li = document.createElement("li");
    li.innerHTML = montarCard(dados);
    lista.appendChild(li);
  });
}

function atualizarResumo(registros) {
  const hoje = new Date();

  totalRegistrosEl.textContent = String(registros.length);
  totalAbertosEl.textContent = String(
    registros.filter((item) => String(item?.acompanhamento?.statusOcorrencia || "").toLowerCase() === "aberto").length
  );
  totalRiscoAltoEl.textContent = String(registros.filter((item) => nivelRiscoAlto(item)).length);
  totalPlanoEl.textContent = String(
    registros.filter((item) => String(item?.planoAcao?.necessita || "").toLowerCase() === "sim").length
  );
  totalHojeEl.textContent = String(
    registros.filter((item) => {
      const data = item?.identificacao?.dataRegistro;
      return data && mesmaDataLocal(data, hoje);
    }).length
  );

  const primeiro = registros[0];
  ultimaAtualizacaoEl.textContent = primeiro
    ? formatarTimestamp(primeiro.atualizadoEm || primeiro.criadoEm)
    : "--";
}

function reaplicarRenderizacao() {
  renderizarLista();
  atualizarResumo(currentDocsCache);
}

function montarItemDetalhe(titulo, valor) {
  return `
    <div class="detail-item">
      <div class="detail-item-title">${escapeHtml(titulo)}</div>
      <div class="detail-item-obs">${valor ? escapeHtml(valor) : "--"}</div>
    </div>
  `;
}

function montarDetalhesModal(dados) {
  const categorias = [...(dados?.classificacao?.categoriasRisco || [])];
  if (dados?.classificacao?.categoriaOutrosTexto && categorias.includes("Outros")) {
    categorias.push(`Detalhe: ${dados.classificacao.categoriaOutrosTexto}`);
  }

  const fotoHtml = dados?.evidencias?.fotoURL
    ? `
      <section class="detail-group">
        <h4>Foto da ocorrência</h4>
        <img class="detail-photo" src="${dados.evidencias.fotoURL}" alt="Foto da ocorrência" />
      </section>
    `
    : "";

  return `
    <div class="detail-grid">
      <div class="detail-box">
        <span>Colaborador</span>
        <strong>${escapeHtml(dados?.identificacao?.nomeColaborador || "--")}</strong>
      </div>

      <div class="detail-box">
        <span>Data do registro</span>
        <strong>${formatarDataHoraBR(dados?.identificacao?.dataRegistro)}</strong>
      </div>

      <div class="detail-box">
        <span>Nível de risco</span>
        <strong>${escapeHtml(dados?.classificacao?.nivelRisco || "--")}</strong>
      </div>

      <div class="detail-box">
        <span>Status</span>
        <strong>${escapeHtml(dados?.acompanhamento?.statusOcorrencia || "--")}</strong>
      </div>
    </div>

    <section class="detail-group">
      <h4>Identificação</h4>
      ${montarItemDetalhe("Setor / Área", dados?.identificacao?.setorArea)}
      ${montarItemDetalhe("Unidade / Local", dados?.identificacao?.unidadeLocal)}
    </section>

    <section class="detail-group">
      <h4>Classificação</h4>
      ${montarItemDetalhe("Tipo de ocorrência", dados?.classificacao?.tipoOcorrencia)}
      ${montarItemDetalhe("Categoria do risco", categorias.join(", "))}
      ${montarItemDetalhe("Nível de risco", dados?.classificacao?.nivelRisco)}
    </section>

    <section class="detail-group">
      <h4>Descrição</h4>
      ${montarItemDetalhe("Situação observada", dados?.descricao?.descricaoSituacao)}
      ${montarItemDetalhe("Poderia causar lesão?", dados?.descricao?.poderiaCausarLesao)}
      ${montarItemDetalhe("Tipo de lesão", dados?.descricao?.tipoLesao)}
    </section>

    ${fotoHtml}

    <section class="detail-group">
      <h4>Ação imediata</h4>
      ${montarItemDetalhe("Foi realizada ação imediata?", dados?.acaoImediata?.realizada)}
      ${montarItemDetalhe("Ação tomada", dados?.acaoImediata?.descricao)}
    </section>

    <section class="detail-group">
      <h4>Plano de ação</h4>
      ${montarItemDetalhe("Necessita plano de ação?", dados?.planoAcao?.necessita)}
      ${montarItemDetalhe("Responsável pela ação", dados?.planoAcao?.responsavel)}
      ${montarItemDetalhe("Prazo para conclusão", formatarDataBR(dados?.planoAcao?.prazoConclusao))}
    </section>

    <section class="detail-group">
      <h4>Acompanhamento</h4>
      ${montarItemDetalhe("Status da ocorrência", dados?.acompanhamento?.statusOcorrencia)}
      ${montarItemDetalhe("Responsável pela verificação", dados?.acompanhamento?.responsavelVerificacao)}
      ${montarItemDetalhe("Data da verificação", formatarDataBR(dados?.acompanhamento?.dataVerificacao))}
      ${montarItemDetalhe("Observações finais", dados?.acompanhamento?.observacoesFinais)}
      ${montarItemDetalhe("Última atualização", formatarTimestamp(dados?.atualizadoEm || dados?.criadoEm))}
    </section>
  `;
}

function abrirModal(docId) {
  const dados = currentDocsCache.find((item) => item.__docId === docId);
  if (!dados) return;

  openedDocId = docId;
  modalTitle.textContent = dados?.identificacao?.nomeColaborador || "Detalhes do registro";
  modalSubtitle.textContent = `Registro de ${formatarDataHoraBR(dados?.identificacao?.dataRegistro)}`;
  modalBody.innerHTML = montarDetalhesModal(dados);
  detailsModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function fecharModal() {
  openedDocId = null;
  detailsModal.classList.add("hidden");
  document.body.style.overflow = "";
}

function obterImagemDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function carregarImagem(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function comprimirImagem(file) {
  const dataUrlOriginal = await obterImagemDataURL(file);
  const img = await carregarImagem(dataUrlOriginal);

  let largura = img.width;
  let altura = img.height;

  if (largura > IMAGE_MAX_WIDTH) {
    const proporcao = IMAGE_MAX_WIDTH / largura;
    largura = IMAGE_MAX_WIDTH;
    altura = Math.round(altura * proporcao);
  }

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, largura, altura);

  return canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
}

function estimarTamanhoBase64(base64) {
  return Math.round((base64.length * 3) / 4);
}

async function uploadFotoBase64(base64, docId) {
  if (!base64) {
    return {
      url: "",
      path: ""
    };
  }

  const caminho = `quase-acidentes/${docId}/${Date.now()}.jpg`;
  const storageRef = ref(storage, caminho);

  await uploadString(storageRef, base64, "data_url");
  const downloadURL = await getDownloadURL(storageRef);

  return {
    url: downloadURL,
    path: caminho
  };
}

async function excluirFotoStorage(path) {
  if (!path) return;
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.warn("Não foi possível excluir a foto antiga do Storage:", error);
  }
}

// =========================
// EVENTOS UI
// =========================
categoriaOutrosCheck.addEventListener("change", atualizarCamposCondicionais);

document.querySelectorAll('input[name="poderiaCausarLesao"]').forEach((radio) => {
  radio.addEventListener("change", atualizarCamposCondicionais);
});

document.querySelectorAll('input[name="acaoImediataRealizada"]').forEach((radio) => {
  radio.addEventListener("change", atualizarCamposCondicionais);
});

document.querySelectorAll('input[name="necessitaPlanoAcao"]').forEach((radio) => {
  radio.addEventListener("change", atualizarCamposCondicionais);
});

fotoOcorrencia.addEventListener("change", async () => {
  const arquivo = fotoOcorrencia.files?.[0];

  if (!arquivo) {
    currentPhotoBase64 = "";
    exibirPreviewFoto(currentUploadedPhotoURL || "");
    setMensagem("Nenhuma foto selecionada.");
    return;
  }

  try {
    setMensagem("Comprimindo imagem...");
    const base64 = await comprimirImagem(arquivo);
    const tamanhoEstimado = estimarTamanhoBase64(base64);

    if (tamanhoEstimado > IMAGE_MAX_BYTES) {
      currentPhotoBase64 = "";
      exibirPreviewFoto(currentUploadedPhotoURL || "");
      setMensagem("A imagem ainda ficou muito grande. Escolha uma foto menor.", true);
      fotoOcorrencia.value = "";
      return;
    }

    currentPhotoBase64 = base64;
    exibirPreviewFoto(base64);
    setMensagem("Imagem pronta para salvar.");
  } catch (error) {
    console.error("Erro ao processar imagem:", error);
    currentPhotoBase64 = "";
    exibirPreviewFoto(currentUploadedPhotoURL || "");
    setMensagem("Erro ao processar imagem.", true);
  }
});

closeModalBtn.addEventListener("click", fecharModal);

detailsModal.addEventListener("click", (e) => {
  if (e.target === detailsModal) fecharModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !detailsModal.classList.contains("hidden")) {
    fecharModal();
  }
});

lista.addEventListener("click", (e) => {
  const card = e.target.closest("[data-open-id]");
  if (!card) return;
  abrirModal(card.dataset.openId);
});

modalEditBtn.addEventListener("click", () => {
  if (!openedDocId) return;

  const dados = currentDocsCache.find((item) => item.__docId === openedDocId);
  if (!dados) return;

  editingDocId = openedDocId;
  preencherFormulario(dados);
  atualizarModoFormulario();
  setMensagem(`Modo edição ativado para ${dados?.identificacao?.nomeColaborador || "registro"}.`);
  fecharModal();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

modalDeleteBtn.addEventListener("click", async () => {
  if (!openedDocId) return;

  const dados = currentDocsCache.find((item) => item.__docId === openedDocId);
  const nome = dados?.identificacao?.nomeColaborador || "este registro";
  const confirmar = confirm(`Deseja realmente excluir o registro de ${nome}?`);

  if (!confirmar) return;

  try {
    await deleteDoc(doc(db, COLLECTION_NAME, openedDocId));

    if (dados?.evidencias?.fotoPath) {
      await excluirFotoStorage(dados.evidencias.fotoPath);
    }

    if (editingDocId === openedDocId) {
      limparFormulario();
    }

    setMensagem("Registro excluído com sucesso.");
    fecharModal();
  } catch (error) {
    console.error("Erro ao excluir registro:", error);
    setMensagem(`Erro ao excluir registro: ${error.message}`, true);
  }
});

btnVerMais.addEventListener("click", () => {
  visibleCount += PAGE_SIZE;
  renderizarLista();
});

btnVerMenos.addEventListener("click", () => {
  visibleCount = PAGE_SIZE;
  renderizarLista();
});

filtroNomeEl.addEventListener("input", () => {
  visibleCount = PAGE_SIZE;
  reaplicarRenderizacao();
});

filtroStatusEl.addEventListener("change", () => {
  visibleCount = PAGE_SIZE;
  reaplicarRenderizacao();
});

filtroDataInicioEl.addEventListener("input", () => {
  visibleCount = PAGE_SIZE;
  reaplicarRenderizacao();
});

filtroDataFimEl.addEventListener("input", () => {
  visibleCount = PAGE_SIZE;
  reaplicarRenderizacao();
});

btnLimparFiltros.addEventListener("click", () => {
  filtroNomeEl.value = "";
  filtroStatusEl.value = "";
  filtroDataInicioEl.value = "";
  filtroDataFimEl.value = "";
  visibleCount = PAGE_SIZE;
  reaplicarRenderizacao();
});

cancelEditBtn.addEventListener("click", () => {
  limparFormulario();
});

// =========================
// SALVAR
// =========================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    submitBtn.disabled = true;
    atualizarCamposCondicionais();

    const dados = montarDadosFormulario();
    const erroValidacao = validarDados(dados);

    if (erroValidacao) {
      setMensagem(erroValidacao, true);
      return;
    }

    const docId = editingDocId || gerarId();
    const dadosExistentes = currentDocsCache.find((item) => item.__docId === docId);

    let fotoURL = dadosExistentes?.evidencias?.fotoURL || "";
    let fotoPath = dadosExistentes?.evidencias?.fotoPath || "";

    if (currentPhotoBase64) {
      setMensagem("Enviando foto...");
      const upload = await uploadFotoBase64(currentPhotoBase64, docId);

      if (upload.url) {
        if (fotoPath && fotoPath !== upload.path) {
          await excluirFotoStorage(fotoPath);
        }

        fotoURL = upload.url;
        fotoPath = upload.path;
      }
    }

    const payload = {
      ...dados,
      evidencias: {
        fotoURL,
        fotoPath
      },
      criadoEm: dadosExistentes?.criadoEm || serverTimestamp(),
      atualizadoEm: serverTimestamp()
    };

    await setDoc(doc(db, COLLECTION_NAME, docId), payload, { merge: true });

    setMensagem(editingDocId ? "Registro atualizado com sucesso." : "Registro salvo com sucesso.");
    limparFormulario();
  } catch (error) {
    console.error("Erro ao salvar registro:", error);
    setMensagem(`Erro ao salvar registro: ${error.message}`, true);
  } finally {
    submitBtn.disabled = false;
  }
});

// =========================
// LISTENER FIRESTORE
// =========================
const q = query(collection(db, COLLECTION_NAME), orderBy("atualizadoEm", "desc"));

onSnapshot(q, (snapshot) => {
  currentDocsCache = snapshot.docs.map((docSnap) => ({
    __docId: docSnap.id,
    ...docSnap.data()
  }));

  reaplicarRenderizacao();
}, (error) => {
  console.error("Erro ao carregar registros:", error);
  lista.innerHTML = `
    <li class="empty-state">
      <strong>Erro ao carregar registros.</strong>
      <span>${escapeHtml(error.message || "Verifique as permissões do Firestore.")}</span>
    </li>
  `;
  setMensagem(`Erro ao carregar registros: ${error.message}`, true);
});

// =========================
// INÍCIO
// =========================
atualizarCamposCondicionais();
atualizarModoFormulario();
setMensagem("Sistema pronto para uso.");
