// src/pages/Login.test.jsx
import React from "react";
import { render, screen } from "@testing-library/react";
import "../i18n";

// 🔹 mock navigate so `useNavigate()` doesn't crash in tests
const mockNavigate = jest.fn();

// ✅ Mock react-router-dom: keep everything, override useNavigate
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ✅ Mock axios wrapper so Jest never touches real axios (ESM)
jest.mock("../api/axios", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

// ✅ Mock auth API used by Login (if any)
jest.mock("../api/auth", () => ({
  login: jest.fn(),
}));

import { MemoryRouter } from "react-router-dom";
import Login from "./Login";

describe("Login page", () => {
  it("renders login page", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    // Adjust if your heading text is different (e.g. Login to your account)
    const heading = screen.getByText(/login/i);
    expect(heading).toBeInTheDocument();
  });
});