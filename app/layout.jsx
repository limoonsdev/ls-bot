import './globals.css';

export const metadata = {
  title: 'PrimeGen.eu | Connect',
  description: 'Connect to PrimeGen services securely',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
