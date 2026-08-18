import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import FirebaseAnalytics from "@/components/common/FirebaseAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "CA Office CRM",
  description: "Professional CRM and workflow management for CA offices",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-gray-900">
        <AuthProvider>
          <FirebaseAnalytics />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
