import QRCode from 'qrcode';

export const generateQRCode = async (url) => {
  return await QRCode.toDataURL(url, { width: 300, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
};
