import zlib from 'node:zlib';

// Escritor ZIP minimo (deflate), suficiente para montar pacotes .docx sem dependencias externas.
export function criarZip(arquivos) {
  const locais = [];
  const central = [];
  let deslocamento = 0;
  const agora = new Date();
  const hora = (agora.getHours() << 11) | (agora.getMinutes() << 5) | (agora.getSeconds() >> 1);
  const data = ((agora.getFullYear() - 1980) << 9) | ((agora.getMonth() + 1) << 5) | agora.getDate();
  for (const [nome, conteudo] of arquivos) {
    const bruto = Buffer.isBuffer(conteudo) ? conteudo : Buffer.from(conteudo, 'utf8');
    const comprimido = zlib.deflateRawSync(bruto);
    const crc = zlib.crc32(bruto) >>> 0;
    const nomeBuf = Buffer.from(nome, 'utf8');
    const cab = Buffer.alloc(30);
    cab.writeUInt32LE(0x04034b50, 0);
    cab.writeUInt16LE(20, 4);
    cab.writeUInt16LE(0x0800, 6);
    cab.writeUInt16LE(8, 8);
    cab.writeUInt16LE(hora, 10);
    cab.writeUInt16LE(data, 12);
    cab.writeUInt32LE(crc, 14);
    cab.writeUInt32LE(comprimido.length, 18);
    cab.writeUInt32LE(bruto.length, 22);
    cab.writeUInt16LE(nomeBuf.length, 26);
    cab.writeUInt16LE(0, 28);
    locais.push(cab, nomeBuf, comprimido);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(8, 10);
    dir.writeUInt16LE(hora, 12);
    dir.writeUInt16LE(data, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(comprimido.length, 20);
    dir.writeUInt32LE(bruto.length, 24);
    dir.writeUInt16LE(nomeBuf.length, 28);
    dir.writeUInt32LE(deslocamento, 42);
    central.push(dir, nomeBuf);
    deslocamento += cab.length + nomeBuf.length + comprimido.length;
  }
  const centralBuf = Buffer.concat(central);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(arquivos.length, 8);
  fim.writeUInt16LE(arquivos.length, 10);
  fim.writeUInt32LE(centralBuf.length, 12);
  fim.writeUInt32LE(deslocamento, 16);
  return Buffer.concat([...locais, centralBuf, fim]);
}
