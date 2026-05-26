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
  Hr,
  Img,
} from "@react-email/components";

export default function NewLoginEmail({
  username = "Developer",
  provider = "Google",
  timestamp = new Date().toString(),
}) {
  return (
    <Html>
      <Head />
      <Preview>New Login Detected on HyperStack</Preview>

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
              fontSize: "24px",
              fontWeight: "700",
              textAlign: "center",
              marginBottom: "16px",
            }}
          >
            New Login Detected
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
            We detected a new login to your HyperStack account using{" "}
            <strong style={{ color: "#60a5fa" }}>{provider}</strong> at{" "}
            <strong style={{ color: "#ffffff" }}>{timestamp}</strong>.
          </Text>

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
                fontSize: "14px",
                lineHeight: "24px",
                margin: 0,
                textAlign: "center",
              }}
            >
              If this was you, no further action is required. If you did not authorize this login, please secure your account immediately.
            </Text>
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
