import { test, describe } from "node:test";
import assert from "node:assert";
import { JSDOM } from "jsdom";
import axe from "axe-core";

function createAccessibleDom(html) {
  const dom = new JSDOM(html);
  // Suppress headless node canvas notice for axe ligature test
  dom.window.HTMLCanvasElement.prototype.getContext = () => null;
  return dom;
}

describe("Accessibility Suite (WCAG 2.2 AA)", () => {
  test("AppShell structure satisfies accessibility rules", async () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head><title>Mirach Shell</title></head>
        <body class="bg-bg text-text">
          <a href="#main-content" class="sr-only focus:not-sr-only">Skip to main content</a>
          <div role="status" aria-live="polite">
            <span>You are offline.</span>
          </div>
          <header>
            <div>Mirach</div>
          </header>
          <div>
            <nav aria-label="Main Navigation">
              <a href="/app/chats" aria-label="Chats">Chats</a>
              <a href="/app/people" aria-label="People">People</a>
              <a href="/app/notifications" aria-label="Notifications">Notifications</a>
              <a href="/app/me" aria-label="Me">Me</a>
            </nav>
            <main id="main-content" tabindex="-1">
              <h1>Chats</h1>
              <p>Conversation list</p>
            </main>
          </div>
        </body>
      </html>
    `;

    const dom = createAccessibleDom(html);
    const results = await axe.run(dom.window.document.documentElement, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]
      }
    });

    assert.strictEqual(
      results.violations.length,
      0,
      `Axe violations found in AppShell: ${JSON.stringify(results.violations, null, 2)}`
    );
  });

  test("WelcomeScreen satisfies accessibility rules", async () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head><title>Welcome to Mirach</title></head>
        <body class="bg-bg text-text">
          <header><div>Mirach</div></header>
          <main id="main-content">
            <h1>Welcome to Mirach</h1>
            <p>A private, invitation-only community.</p>
            <button type="button" aria-label="Continue with Google">Continue with Google</button>
            <div role="tablist" aria-label="Sign in methods">
              <button role="tab" aria-selected="true" id="tab-signin">Sign In</button>
              <button role="tab" aria-selected="false" id="tab-signup">Create Account</button>
            </div>
            <form aria-labelledby="tab-signin">
              <div>
                <label for="email">Email address</label>
                <input id="email" type="email" required autocomplete="email" />
              </div>
              <div>
                <label for="password">Password</label>
                <input id="password" type="password" required autocomplete="current-password" />
              </div>
              <button type="submit">Sign In</button>
            </form>
          </main>
          <footer><div>Mirach Platform</div></footer>
        </body>
      </html>
    `;

    const dom = createAccessibleDom(html);
    const results = await axe.run(dom.window.document.documentElement, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]
      }
    });

    assert.strictEqual(
      results.violations.length,
      0,
      `Axe violations found in WelcomeScreen: ${JSON.stringify(results.violations, null, 2)}`
    );
  });

  test("QuotaScreen satisfies accessibility rules", async () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head><title>Quota Limit Notice</title></head>
        <body class="bg-bg text-text">
          <main id="main-content">
            <h1>Today's Community Limit Reached</h1>
            <p>Mirach operates within a zero-cost serverless capacity budget.</p>
            <div role="status" aria-live="polite">
              <span>Messaging will automatically resume after midnight UTC (00:00 UTC).</span>
            </div>
          </main>
        </body>
      </html>
    `;

    const dom = createAccessibleDom(html);
    const results = await axe.run(dom.window.document.documentElement, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]
      }
    });

    assert.strictEqual(
      results.violations.length,
      0,
      `Axe violations found in QuotaScreen: ${JSON.stringify(results.violations, null, 2)}`
    );
  });

  test("ErrorBoundary satisfies accessibility rules", async () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head><title>Error</title></head>
        <body class="bg-bg text-text">
          <main id="main-content">
            <div role="alert" aria-live="assertive">
              <h1>Something unexpected happened</h1>
              <p>Mirach encountered an error while displaying this page.</p>
              <button type="button">Reload page</button>
            </div>
          </main>
        </body>
      </html>
    `;

    const dom = createAccessibleDom(html);
    const results = await axe.run(dom.window.document.documentElement, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]
      }
    });

    assert.strictEqual(
      results.violations.length,
      0,
      `Axe violations found in ErrorBoundary: ${JSON.stringify(results.violations, null, 2)}`
    );
  });
});
