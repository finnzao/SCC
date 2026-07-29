import type { NextConfig } from "next";

// Origem do backend — variável de SERVIDOR (sem NEXT_PUBLIC_): nunca vai para o browser.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

/**
 * CSP: 'unsafe-inline'/'unsafe-eval' em script-src são necessários para o runtime do Next
 * sem plumbing de nonce. O ganho real aqui está em connect-src 'self' (bloqueia exfiltração
 * para origem externa — o que funciona porque a API agora é mesma origem via rewrite),
 * frame-ancestors 'none' (clickjacking), object-src 'none' e form-action 'self'.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",

  /**
   * Proxy same-origin. Sem isto o cookie httpOnly emitido pelo backend ficaria no domínio
   * DELE — e o middleware, que roda no domínio do frontend, não conseguiria lê-lo.
   * Com o rewrite, o browser vê tudo como mesma origem: o cookie é gravado aqui, o
   * middleware valida, o CORS deixa de existir e SameSite=Lax passa a proteger contra CSRF.
   */
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Ignorado pelo browser em http, então é inócuo em dev e ativo em produção.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
