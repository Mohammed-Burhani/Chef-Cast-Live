import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Root HTML for Expo web
 * Injects Google Fonts for Sora and Nunito
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        
        {/* Google Fonts - Sora & Nunito */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=Nunito:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: `
          * {
            box-sizing: border-box;
          }
          body, input, textarea, select, button {
            font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
          h1, h2, h3, h4, h5, h6 {
            font-family: 'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
          body {
            overflow-x: hidden;
            margin: 0;
          }
        ` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
