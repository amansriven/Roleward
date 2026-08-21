import { expect, test } from "@playwright/test";

test.skip(
  process.env.RUN_COGNITO_E2E !== "true",
  "Requires a dedicated Cognito test pool with auto-confirmed users",
);

test("candidate reaches a live dashboard from signup, evidence, and a target job", async ({
  page,
}) => {
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Aman");
  await page.getByLabel("Email").fill("aman@example.com");
  await page.getByLabel("Password").fill("strong-password");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/onboarding/);

  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: /Build my workspace/ }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(
    page.getByText("Confirm the experience from your resume"),
  ).toBeVisible();

  await page.getByRole("link", { name: /Continue/ }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "resume.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 demo resume"),
  });
  await expect(page.getByText("Check every extracted claim.")).toBeVisible();
  while (
    await page.getByRole("button", { name: "Confirm", exact: true }).count()
  )
    await page
      .getByRole("button", { name: "Confirm", exact: true })
      .first()
      .click();
  await page
    .getByRole("button", { name: /Save confirmed evidence/ })
    .dispatchEvent("click");
  await expect(page.getByText("Evidence confirmed.")).toBeVisible();

  await page.goto("/dashboard/applications/new");
  await page.getByRole("button", { name: "Use an example posting" }).click();
  await page.getByRole("button", { name: /Find the requirements/ }).click();
  while (
    await page
      .getByRole("button", { name: "Confirm requirement", exact: true })
      .count()
  )
    await page
      .getByRole("button", { name: "Confirm requirement", exact: true })
      .first()
      .click();
  await page
    .getByRole("button", { name: /Build my readiness map/ })
    .dispatchEvent("click");
  await expect(page.getByText("Preparation map ready")).toBeVisible();

  await page.goto("/dashboard");
  await expect(
    page.getByText("Stripe · Software Engineer, New Grad").first(),
  ).toBeVisible();
  await expect(page.getByText("Today in Backstage")).toBeVisible();
});
