import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
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
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// =========================
// FIREBASE
// =========================
const firebaseConfig = {
  apiKey: "AIzaSyDReYPPhvjjQ4DdLOeQQDg_PrqPCwYaFfU",
  authDomain: "motorista-80298.firebaseapp.com",
  projectId: "motorista-80298",
  storageBucket: "motorista-80298.firebasestorage.app",
  messagingSenderId: "988614619560",
  appId: "1:988614619560:web:f2521ff21aae96aa486d9d",
  measurementId: "G-S1T8661860"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// =========================
// CONFIG
// =========================
const COLLECTION_NAME = "quase-acidentes";
const PAGE_SIZE = 5;

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
const btnExportarExcel = document.getElementById("btnExportarExcel");

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
let currentPhotoUrl = "";
let currentPhotoPath = "";

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

  if (Number.isNaN(data.getTime())) {
    return String(valor).replace("T", " ");
  }

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

function formatarDataArquivo(date = new Date()) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  const hora = String(date.getHours()).padStart(2, "0");
  const minuto = String(date.getMinutes()).padStart(2, "0");
  return `${ano}-${mes}-${dia}_${hora}-${minuto}`;
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

function nivelRiscoBadgeClass(nivel = "") {
  const valor = String(nivel).toLowerCase();
  if (valor === "baixo") return "badge-low";
  if (valor === "médio" || valor === "medio") return "badge-medium";
  if (valor === "alto") return "badge-high";
  if (valor === "crítico" || valor === "critico") return "badge-critical";
  return "badge-medium";
}

function statusBadgeClass(status = "") {
  const valor = String(status).toLowerCase();
  if (valor === "aberto") return "badge-open";
  if (valor === "em andamento") return "badge-progress";
  if (valor === "concluído" || valor === "concluido") return "badge-done";
  return "badge-progress";
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
      fotoUrl: currentPhotoUrl || "",
      fotoPath: currentPhotoPath || ""
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
  if (
    dados.classificacao.categoriasRisco.includes("Outros") &&
    !dados.classificacao.categoriaOutrosTexto
  ) {
    return "Descreva a categoria de risco em Outros.";
  }
  if (!dados.classificacao.nivelRisco) return "Selecione o nível de risco.";

  if (!dados.descricao.descricaoSituacao) return "Descreva a situação observada.";
  if (!dados.descricao.poderiaCausarLesao) return "Informe se a situação poderia causar lesão.";
  if (dados.descricao.poderiaCausarLesao === "Sim" && !dados.descricao.tipoLesao) {
    return "Descreva o tipo de lesão que poderia ocorrer.";
  }

  if (!editingDocId && !fotoOcorrencia.files?.length) {
    return "Anexe uma foto da situação.";
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

async function fazerUploadFoto(docId) {
  const arquivo = fotoOcorrencia.files?.[0];
  if (!arquivo) {
    return {
      fotoUrl: currentPhotoUrl || "",
      fotoPath: currentPhotoPath || ""
    };
  }

  const extensao = arquivo.name.includes(".")
    ? arquivo.name.split(".").pop()
    : "jpg";

  const caminho = `quase-acidentes/${docId}/${Date.now()}.${extensao}`;
  const storageRef = ref(storage, caminho);

  await uploadBytes(storageRef, arquivo);
  const fotoUrl = await getDownloadURL(storageRef);

  return { fotoUrl, fotoPath: caminho };
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

  currentPhotoUrl = dados?.evidencias?.fotoUrl || "";
  currentPhotoPath = dados?.evidencias?.fotoPath || "";
  fotoOcorrencia.value = "";
  exibirPreviewFoto(currentPhotoUrl);

  atualizarCamposCondicionais();
}

function limparFormulario() {
  form.reset();
  dataRegistro.value = agoraLocalInput();

  editingDocId = null;
  currentPhotoUrl = "";
  currentPhotoPath = "";

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

// =========================
// FILTROS / LISTA
// =========================
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

  const cardClass =
    String(status).toLowerCase() === "concluído" || String(status).toLowerCase() === "concluido"
      ? "done-card"
      : nivelRiscoAlto(dados)
        ? "high-risk-card"
        : "alert-card";

  return `
    <article class="status-card status-card-clickable ${cardClass}" data-open-id="${escapeHtml(dados.__docId)}">
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
    btnVerMais.classList.add("hidden");
    btnVerMenos.classList.add("hidden");
    return;
  }

  exibidos.forEach((dados) => {
    const li = document.createElement("li");
    li.innerHTML = montarCard(dados);
    lista.appendChild(li);
  });

  btnVerMais.classList.toggle("hidden", filtrados.length <= visibleCount);
  btnVerMenos.classList.toggle("hidden", visibleCount <= PAGE_SIZE);
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

// =========================
// EXPORTAR EXCEL
// =========================
function gerarLinhasExcel(registros) {
  return registros.map((dados) => ({
    "Data do registro": formatarDataHoraBR(dados?.identificacao?.dataRegistro),
    "Data ISO": dados?.identificacao?.dataRegistro || "",
    "Nome do colaborador": dados?.identificacao?.nomeColaborador || "",
    "Setor / Área": dados?.identificacao?.setorArea || "",
    "Unidade / Local": dados?.identificacao?.unidadeLocal || "",
    "Tipo de ocorrência": dados?.classificacao?.tipoOcorrencia || "",
    "Categoria do risco": (dados?.classificacao?.categoriasRisco || []).join(", "),
    "Outros riscos": dados?.classificacao?.categoriaOutrosTexto || "",
    "Nível de risco": dados?.classificacao?.nivelRisco || "",
    "Descrição da situação": dados?.descricao?.descricaoSituacao || "",
    "Poderia causar lesão": dados?.descricao?.poderiaCausarLesao || "",
    "Tipo de lesão": dados?.descricao?.tipoLesao || "",
    "Ação imediata realizada": dados?.acaoImediata?.realizada || "",
    "Descrição da ação imediata": dados?.acaoImediata?.descricao || "",
    "Necessita plano de ação": dados?.planoAcao?.necessita || "",
    "Responsável pela ação": dados?.planoAcao?.responsavel || "",
    "Prazo para conclusão": dados?.planoAcao?.prazoConclusao || "",
    "Status da ocorrência": dados?.acompanhamento?.statusOcorrencia || "",
    "Responsável pela verificação": dados?.acompanhamento?.responsavelVerificacao || "",
    "Data da verificação": dados?.acompanhamento?.dataVerificacao || "",
    "Observações finais": dados?.acompanhamento?.observacoesFinais || "",
    "Foto URL": dados?.evidencias?.fotoUrl || "",
    "Última atualização": formatarTimestamp(dados.atualizadoEm || dados.criadoEm)
  }));
}

function exportarExcel() {
  const filtrados = getRegistrosFiltrados();

  if (!filtrados.length) {
    alert("Não há registros para exportar com os filtros atuais.");
    return;
  }

  const linhas = gerarLinhasExcel(filtrados);
  const ws = XLSX.utils.json_to_sheet(linhas);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Quase-Acidente");

  const nomeArquivo = `quase-acidente_${formatarDataArquivo()}.xlsx`;
  XLSX.writeFile(wb, nomeArquivo);
}

// =========================
// MODAL
// =========================
function montarItemDetalhe(titulo, valor) {
  return `
    <div class="detail-item">
      <div class="detail-item-main">
        <div class="detail-item-title">${escapeHtml(titulo)}</div>
        <div class="detail-item-obs">${valor ? escapeHtml(valor) : "--"}</div>
      </div>
    </div>
  `;
}

function montarDetalhesModal(dados) {
  const categorias = [...(dados?.classificacao?.categoriasRisco || [])];
  if (dados?.classificacao?.categoriaOutrosTexto && categorias.includes("Outros")) {
    categorias.push(`Detalhe: ${dados.classificacao.categoriaOutrosTexto}`);
  }

  const fotoHtml = dados?.evidencias?.fotoUrl
    ? `
      <section class="detail-group">
        <h4>Foto da ocorrência</h4>
        <img class="detail-photo" src="${dados.evidencias.fotoUrl}" alt="Foto da ocorrência" />
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
        <strong><span class="status-badge ${nivelRiscoBadgeClass(dados?.classificacao?.nivelRisco)}">${escapeHtml(dados?.classificacao?.nivelRisco || "--")}</span></strong>
      </div>

      <div class="detail-box">
        <span>Status</span>
        <strong><span class="status-badge ${statusBadgeClass(dados?.acompanhamento?.statusOcorrencia)}">${escapeHtml(dados?.acompanhamento?.statusOcorrencia || "--")}</span></strong>
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

// =========================
// EVENTOS
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

fotoOcorrencia.addEventListener("change", () => {
  const arquivo = fotoOcorrencia.files?.[0];
  if (!arquivo) {
    exibirPreviewFoto(currentPhotoUrl || "");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    exibirPreviewFoto(e.target?.result || "");
  };
  reader.readAsDataURL(arquivo);
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

    if (editingDocId === openedDocId) {
      limparFormulario();
    }

    setMensagem("Registro excluído com sucesso.");
    fecharModal();
  } catch (error) {
    console.error("Erro ao excluir registro:", error);
    setMensagem(`Erro ao excluir registro: ${error.message}`, true);
    alert(`Erro ao excluir registro: ${error.message}`);
  }
});

btnVerMais.addEventListener("click", () => {
  visibleCount += PAGE_SIZE;
  renderizarLista();
});

btnVerMenos.addEventListener("click", () => {
  visibleCount = PAGE_SIZE;
  renderizarLista();
  window.scrollTo({ top: document.querySelector(".panel.card:last-of-type")?.offsetTop || 0, behavior: "smooth" });
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

btnExportarExcel.addEventListener("click", exportarExcel);

lista.addEventListener("click", (e) => {
  const card = e.target.closest("[data-open-id]");
  if (!card) return;

  const docId = card.getAttribute("data-open-id");
  if (!docId) return;

  abrirModal(docId);
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
      alert(erroValidacao);
      return;
    }

    const docId = editingDocId || crypto.randomUUID();
    const docRef = doc(db, COLLECTION_NAME, docId);

    setMensagem(editingDocId ? "Atualizando registro..." : "Salvando registro...");

    const { fotoUrl, fotoPath } = await fazerUploadFoto(docId);
    dados.evidencias.fotoUrl = fotoUrl;
    dados.evidencias.fotoPath = fotoPath;

    await setDoc(
      docRef,
      {
        ...dados,
        ...(editingDocId ? {} : { criadoEm: serverTimestamp() }),
        atualizadoEm: serverTimestamp()
      },
      { merge: true }
    );

    setMensagem(editingDocId ? "Registro atualizado com sucesso." : "Registro salvo com sucesso.");
    limparFormulario();
  } catch (error) {
    console.error("Erro ao salvar:", error);
    setMensagem(`Erro ao salvar: ${error.message}`, true);
    alert(`Erro ao salvar: ${error.message}`);
  } finally {
    submitBtn.disabled = false;
  }
});

// =========================
// CANCELAR EDIÇÃO
// =========================
cancelEditBtn.addEventListener("click", () => {
  limparFormulario();
  setMensagem("Edição cancelada.");
});

// =========================
// TEMPO REAL
// =========================
const colRef = collection(db, COLLECTION_NAME);
const q = query(colRef, orderBy("identificacao.dataRegistro", "desc"));

onSnapshot(
  q,
  (snapshot) => {
    currentDocsCache = snapshot.docs.map((registro) => ({
      __docId: registro.id,
      ...registro.data()
    }));

    reaplicarRenderizacao();
  },
  (error) => {
    console.error("Erro no onSnapshot:", error);
    setMensagem(`Erro ao carregar registros: ${error.message}`, true);
  }
);

// =========================
// INICIALIZAÇÃO
// =========================
atualizarCamposCondicionais();
atualizarModoFormulario();
setMensagem("Sistema pronto para uso.");
