(function () {
  const win1252 = {
    "\u20ac": 0x80, "\u201a": 0x82, "\u0192": 0x83, "\u201e": 0x84,
    "\u2026": 0x85, "\u2020": 0x86, "\u2021": 0x87, "\u02c6": 0x88,
    "\u2030": 0x89, "\u0160": 0x8a, "\u2039": 0x8b, "\u0152": 0x8c,
    "\u017d": 0x8e, "\u2018": 0x91, "\u2019": 0x92, "\u201c": 0x93,
    "\u201d": 0x94, "\u2022": 0x95, "\u2013": 0x96, "\u2014": 0x97,
    "\u02dc": 0x98, "\u2122": 0x99, "\u0161": 0x9a, "\u203a": 0x9b,
    "\u0153": 0x9c, "\u017e": 0x9e, "\u0178": 0x9f
  };

  const decoder = new TextDecoder("utf-8", { fatal: true });
  const sinaisRuins = /[\u00c2\u00c3\u00c5\u00c6\u00e2\u00f0]|Ã|Â|â|ð/;

  const trocasPontuais = [
    ["INJE\u00c3\u2021\u00c3O", "INJE\u00c7\u00c3O"],
    ["INJE\u00c3\u2021\u00c2O", "INJE\u00c7\u00c3O"],
    ["RELAT\u00c3\u201cRIO", "RELAT\u00d3RIO"],
    ["HIST\u00c3\u201cRICO", "HIST\u00d3RICO"],
    ["PRODU\u00c3\u2021\u00c3O", "PRODU\u00c7\u00c3O"],
    ["GEST\u00c3O", "GEST\u00c3O"],
    ["M\u00c3\u201cDULO", "M\u00d3DULO"],
    ["CONFER\u00c3\u0160NCIA", "CONFER\u00caNCIA"],
    ["PERMISS\u00c3\u2022ES", "PERMISS\u00d5ES"],
    ["N\u00c3O", "N\u00c3O"],
    ["Â°C", "\u00b0C"],
    ["NÂº", "N\u00ba"],
    ["ðŸ“‚", ""],
    ["ðŸ“", ""],
    ["ðŸ“…", ""],
    ["ðŸ“„", ""],
    ["ðŸ–¨ï¸", ""],
    ["â€¢", "-"],
    ["â€”", "-"]
  ];

  function contarRuido(texto) {
    return (String(texto || "").match(sinaisRuins) || []).length;
  }

  function tentarDecodificar(texto) {
    const bytes = [];
    for (const char of texto) {
      const code = char.codePointAt(0);
      if (code <= 0xff) {
        bytes.push(code);
      } else if (Object.prototype.hasOwnProperty.call(win1252, char)) {
        bytes.push(win1252[char]);
      } else {
        return texto;
      }
    }

    try {
      const decodificado = decoder.decode(Uint8Array.from(bytes));
      return contarRuido(decodificado) <= contarRuido(texto) ? decodificado : texto;
    } catch (erro) {
      return texto;
    }
  }

  function limparTexto(valor) {
    if (!valor || typeof valor !== "string") return valor;
    let saida = valor;
    for (let i = 0; i < 4 && sinaisRuins.test(saida); i += 1) {
      const novo = tentarDecodificar(saida);
      if (novo === saida) break;
      saida = novo;
    }
    trocasPontuais.forEach(([ruim, bom]) => {
      saida = saida.split(ruim).join(bom);
    });
    return saida;
  }

  function limparNo(no) {
    if (!no) return;
    if (no.nodeType === Node.TEXT_NODE) {
      const novo = limparTexto(no.nodeValue);
      if (novo !== no.nodeValue) no.nodeValue = novo;
      return;
    }
    if (no.nodeType !== Node.ELEMENT_NODE) return;
    ["title", "placeholder", "aria-label", "value"].forEach(attr => {
      if (!no.hasAttribute || !no.hasAttribute(attr)) return;
      const atual = no.getAttribute(attr);
      const novo = limparTexto(atual);
      if (novo !== atual) no.setAttribute(attr, novo);
    });
    no.childNodes && no.childNodes.forEach(limparNo);
  }

  function limparPagina() {
    limparNo(document.documentElement);
    document.title = limparTexto(document.title);
  }

  window.atlasLimparTextoTela = limparPagina;

  document.addEventListener("DOMContentLoaded", () => {
    limparPagina();
    const alvo = document.body || document.documentElement;
    const observador = new MutationObserver(muts => {
      muts.forEach(mut => {
        mut.addedNodes && mut.addedNodes.forEach(limparNo);
        if (mut.type === "characterData") limparNo(mut.target);
        if (mut.type === "attributes") limparNo(mut.target);
      });
    });
    observador.observe(alvo, { childList: true, subtree: true, characterData: true, attributes: true });
    setInterval(limparPagina, 1000);
  });
})();
