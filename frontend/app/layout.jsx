import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'Hope International',
  description: 'Earn While You Shop'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" style={{ colorScheme: 'dark' }}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
