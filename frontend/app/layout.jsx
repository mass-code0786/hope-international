import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'Hope International',
  description: 'Earn While You Shop'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
