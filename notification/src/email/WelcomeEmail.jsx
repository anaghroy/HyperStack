import React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
  Img,
} from "@react-email/components";

export default function WelcomeEmail({
  username = "Developer",
  provider = "Google",
}) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to HyperStack</Preview>

      <Body
        style={{
          backgroundColor: "#0f172a",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          margin: 0,
          padding: "40px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: "#111827",
            borderRadius: "16px",
            padding: "40px",
            maxWidth: "600px",
            margin: "0 auto",
            border: "1px solid #1f2937",
          }}
        >
          {/* Logo */}
          <Section style={{ textAlign: "center", marginBottom: "32px" }}>
            <Img
              src="https://your-domain.com/logo.png"
              alt="HyperStack"
              width="72"
              height="72"
              style={{
                margin: "0 auto",
                borderRadius: "16px",
              }}
            />
          </Section>

          {/* Heading */}
          <Heading
            style={{
              color: "#ffffff",
              fontSize: "32px",
              fontWeight: "700",
              textAlign: "center",
              marginBottom: "16px",
            }}
          >
            Welcome to HyperStack
          </Heading>

          {/* Subtitle */}
          <Text
            style={{
              color: "#9ca3af",
              fontSize: "16px",
              lineHeight: "28px",
              textAlign: "center",
              marginBottom: "32px",
            }}
          >
            Hey <strong style={{ color: "#ffffff" }}>{username}</strong>,
            <br />
            Thanks for joining HyperStack using{" "}
            <strong style={{ color: "#60a5fa" }}>{provider}</strong>.
          </Text>

          {/* Card */}
          <Section
            style={{
              backgroundColor: "#1e293b",
              borderRadius: "12px",
              padding: "24px",
              marginBottom: "32px",
              border: "1px solid #334155",
            }}
          >
            <Text
              style={{
                color: "#e5e7eb",
                fontSize: "16px",
                lineHeight: "28px",
                margin: 0,
              }}
            >
              You now have access to:
            </Text>

            <ul
              style={{
                color: "#cbd5e1",
                paddingLeft: "20px",
                marginTop: "16px",
                lineHeight: "32px",
              }}
            >
              <li> AI-powered code generation</li>
              <li> Kubernetes sandbox environments</li>
              <li> Live React/Vite previews</li>
              <li> Secure OAuth authentication</li>
              <li> Multi-model AI orchestration</li>
            </ul>
          </Section>

          {/* CTA */}
          <Section style={{ textAlign: "center", marginBottom: "32px" }}>
            <Button
              href="http://localhost:5173"
              style={{
                backgroundColor: "#2563eb",
                color: "#ffffff",
                padding: "14px 28px",
                borderRadius: "10px",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "16px",
                display: "inline-block",
              }}
            >
              Launch HyperStack
            </Button>
          </Section>

          <Hr
            style={{
              borderColor: "#1f2937",
              margin: "32px 0",
            }}
          />

          {/* Footer */}
          <Text
            style={{
              color: "#6b7280",
              fontSize: "14px",
              textAlign: "center",
              lineHeight: "24px",
            }}
          >
            Built with ❤️ by HyperStack
            <br />
            AI-Powered Cloud Development Platform
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
