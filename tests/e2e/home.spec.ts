import { expect, test } from "@playwright/test";

test("shows the Backstage product foundation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Get where you need to be",
  );
  await expect(
    page.getByRole("heading", { name: "Resume Kitchen" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Zed" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Stage Fright", exact: true }),
  ).toBeVisible();
});

test("landing-page demos respond to candidate choices", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Backend" }).click();
  await expect(
    page.getByText("Practice one SQL join problem in Zed"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Season this bullet" }).click();
  await expect(
    page.getByText("Evidence: 40 students, five teams"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Run samples" }).click();
  await expect(page.getByText("4 of 4 sample tests passed")).toBeVisible();
});

test("product and authentication routes are available", async ({ page }) => {
  await page.goto("/stage-fright");
  await expect(page.locator("h1")).toContainText(
    "Walk into the story you already lived",
  );

  await page.goto("/signup");
  await expect(page.locator("h1")).toContainText("Create your workspace");
  await expect(
    page
      .getByLabel("Email")
      .or(page.getByText("Cognito configuration required")),
  ).toBeVisible();
});
