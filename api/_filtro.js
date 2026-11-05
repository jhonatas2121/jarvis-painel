const { num } = require('./_busca');

function avaliar(p, f) {
  const preco = num(p.price, 0);
  const taxa = num(p.commissionRate, 0);
  const nota = num(p.ratingStar, 0);
  const vendas = Number(p.sales) || 0;
  const ganho = preco * taxa;
  if (taxa * 100 < f.minCom) return null;
  if (nota < f.minNota) return null;
  if (vendas < f.minVendas) return null;
  if (preco > f.maxPreco) return null;
  const emergente = vendas >= 100 && vendas <= 3000;
  let score = Math.min(taxa * 100, 30) * 1.5;
  score += nota >= 4.8 ? 15 : 10;
  score += Math.min(Math.log10(vendas + 1) * 5, 20);
  score += Math.min(ganho * 2, 20);
  if (emergente) score += 10;
  return {
    nome: p.productName,
    preco: preco,
    comissaoPct: Math.round(taxa * 1000) / 10,
    ganhoPorVenda: Math.round(ganho * 100) / 100,
    vendas: vendas,
    nota: nota,
    loja: p.shopName,
    emergente: emergente,
    score: Math.round(Math.min(score, 100)),
    link: p.offerLink,
    imagem: p.imageUrl
  };
}

module.exports = { avaliar };
