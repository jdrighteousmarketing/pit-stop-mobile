import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';

export default function CustomerQRCode({ customerIdCode }) {
  if (!customerIdCode) return null;

  const qrValue = `PS-CUSTOMER|${customerIdCode}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-5 mt-4 bg-card rounded-2xl border border-border p-5 flex flex-col items-center"
    >
      <h3 className="font-display font-bold mb-1">
        My Rewards QR Code
      </h3>

      <p className="text-xs text-muted-foreground mb-4 text-center">
        Show this to staff to earn or redeem points
      </p>

      <div className="bg-white p-5 rounded-2xl shadow-sm">
        <QRCodeSVG
          value={qrValue}
          size={260}
          bgColor="#ffffff"
          fgColor="#1a1a1a"
          level="H"
        />
      </div>

      <p className="mt-3 text-xs font-mono text-muted-foreground tracking-widest">
        {customerIdCode}
      </p>
    </motion.div>
  );
}