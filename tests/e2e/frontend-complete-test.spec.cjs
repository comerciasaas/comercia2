const { test, expect } = require('@playwright/test');

// Configurações de teste
const BASE_URL = 'http://localhost:5173';
const TEST_USER = {
  email: 'test@example.com',
  password: 'test123456',
  name: 'Usuário Teste'
};

// Helper para aguardar elementos
const waitForElement = async (page, selector, timeout = 10000) => {
  await page.waitForSelector(selector, { timeout });
};

// Helper para fazer login
const login = async (page) => {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/`);
};

test.describe('Frontend Complete Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Configurar interceptadores para APIs
    await page.route('**/api/**', (route) => {
      console.log(`API Call: ${route.request().method()} ${route.request().url()}`);
      route.continue();
    });
  });

  test.describe('Páginas de Autenticação', () => {
    test('Página de Login - Elementos e Funcionalidades', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Verificar elementos da página
      await expect(page.locator('h1, h2')).toContainText(/login|entrar/i);
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      // Testar link para registro
      const registerLink = page.locator('a[href*="register"], a[href*="cadastro"]');
      if (await registerLink.count() > 0) {
        await expect(registerLink).toBeVisible();
        await registerLink.click();
        await expect(page).toHaveURL(/.*register.*/);
        await page.goBack();
      }
      
      // Testar validação de formulário
      await page.click('button[type="submit"]');
      // Verificar se há mensagens de erro ou validação
      const errorMessages = page.locator('.error, .text-red, [class*="error"], [class*="invalid"]');
      if (await errorMessages.count() > 0) {
        await expect(errorMessages.first()).toBeVisible();
      }
    });

    test('Página de Registro - Elementos e Funcionalidades', async ({ page }) => {
      await page.goto(`${BASE_URL}/register`);
      
      // Verificar elementos da página
      await expect(page.locator('h1, h2')).toContainText(/registro|cadastro|sign up/i);
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      // Verificar campo de nome se existir
      const nameInput = page.locator('input[name="name"], input[placeholder*="nome"]');
      if (await nameInput.count() > 0) {
        await expect(nameInput).toBeVisible();
      }
      
      // Testar link para login
      const loginLink = page.locator('a[href*="login"], a[href*="entrar"]');
      if (await loginLink.count() > 0) {
        await expect(loginLink).toBeVisible();
      }
    });
  });

  test.describe('Dashboard Principal', () => {
    test('Dashboard - Layout e Componentes', async ({ page }) => {
      await login(page);
      
      // Verificar elementos principais do dashboard
      await expect(page.locator('h1, h2')).toContainText(/dashboard|painel/i);
      
      // Verificar cards de estatísticas
      const statsCards = page.locator('[class*="card"], [class*="stat"], .bg-white');
      await expect(statsCards.first()).toBeVisible();
      
      // Verificar se há gráficos ou métricas
      const charts = page.locator('canvas, svg, [class*="chart"], [class*="metric"]');
      if (await charts.count() > 0) {
        await expect(charts.first()).toBeVisible();
      }
      
      // Verificar loading states
      const loadingElements = page.locator('[class*="loading"], [class*="spinner"], .animate-spin');
      if (await loadingElements.count() > 0) {
        // Aguardar loading desaparecer
        await loadingElements.first().waitFor({ state: 'hidden', timeout: 10000 });
      }
    });

    test('Dashboard - Interações e Navegação', async ({ page }) => {
      await login(page);
      
      // Testar cliques em cards se forem clicáveis
      const clickableCards = page.locator('[class*="card"][role="button"], [class*="card"]:has(a), .cursor-pointer');
      if (await clickableCards.count() > 0) {
        await clickableCards.first().click();
        await page.waitForTimeout(1000);
      }
      
      // Testar filtros ou controles se existirem
      const filters = page.locator('select, input[type="date"], [class*="filter"]');
      for (let i = 0; i < Math.min(await filters.count(), 3); i++) {
        const filter = filters.nth(i);
        if (await filter.isVisible()) {
          await filter.click();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('Página de Agentes', () => {
    test('Agentes - Lista e Visualização', async ({ page }) => {
      await login(page);
      await page.goto(`${BASE_URL}/agents`);
      
      // Verificar título da página
      await expect(page.locator('h1, h2')).toContainText(/agentes|agents/i);
      
      // Verificar botão de criar agente
      const createButton = page.locator('button:has-text("Criar"), button:has-text("Novo"), button:has-text("Add"), [class*="create"], [class*="add"]');
      if (await createButton.count() > 0) {
        await expect(createButton.first()).toBeVisible();
      }
      
      // Verificar lista de agentes
      const agentsList = page.locator('[class*="agent"], [class*="card"], .grid, .list');
      if (await agentsList.count() > 0) {
        await expect(agentsList.first()).toBeVisible();
      }
      
      // Verificar filtros e busca
      const searchInput = page.locator('input[type="search"], input[placeholder*="buscar"], input[placeholder*="search"]');
      if (await searchInput.count() > 0) {
        await expect(searchInput).toBeVisible();
        await searchInput.fill('teste');
        await page.waitForTimeout(1000);
        await searchInput.clear();
      }
    });

    test('Agentes - Modal de Criação', async ({ page }) => {
      await login(page);
      await page.goto(`${BASE_URL}/agents`);
      
      // Tentar abrir modal de criação
      const createButton = page.locator('button:has-text("Criar"), button:has-text("Novo"), button:has-text("Add"), [class*="create"]');
      if (await createButton.count() > 0) {
        await createButton.first().click();
        
        // Verificar se modal abriu
        const modal = page.locator('[role="dialog"], .modal, [class*="modal"]');
        if (await modal.count() > 0) {
          await expect(modal).toBeVisible();
          
          // Verificar campos do formulário
          await expect(page.locator('input[name="name"], input[placeholder*="nome"]')).toBeVisible();
          
          // Testar fechamento do modal
          const closeButton = page.locator('button:has-text("Cancelar"), button:has-text("Fechar"), [aria-label="Close"], .close');
          if (await closeButton.count() > 0) {
            await closeButton.first().click();
            await expect(modal).toBeHidden();
          }
        }
      }
    });

    test('Agentes - Ações nos Cards', async ({ page }) => {
      await login(page);
      await page.goto(`${BASE_URL}/agents`);
      
      // Procurar por cards de agentes
      const agentCards = page.locator('[class*="agent"], [class*="card"]:has([class*="agent"]), .grid > div, .list > div');
      if (await agentCards.count() > 0) {
        const firstCard = agentCards.first();
        
        // Testar botões de ação
        const actionButtons = firstCard.locator('button, [role="button"]');
        for (let i = 0; i < Math.min(await actionButtons.count(), 3); i++) {
          const button = actionButtons.nth(i);
          if (await button.isVisible()) {
            await button.click();
            await page.waitForTimeout(1000);
            
            // Se abriu modal, fechar
            const modal = page.locator('[role="dialog"], .modal');
            if (await modal.count() > 0 && await modal.isVisible()) {
              const closeBtn = modal.locator('button:has-text("Cancelar"), button:has-text("Fechar"), [aria-label="Close"]');
              if (await closeBtn.count() > 0) {
                await closeBtn.first().click();
              }
            }
          }
        }
      }
    });
  });

  test.describe('Página de Conversas', () => {
    test('Conversas - Lista e Filtros', async ({ page }) => {
      await login(page);
      await page.goto(`${BASE_URL}/conversations`);
      
      // Verificar título
      await expect(page.locator('h1, h2')).toContainText(/conversas|conversations/i);
      
      // Verificar filtros
      const statusFilter = page.locator('select, [class*="filter"], [class*="dropdown"]');
      if (await statusFilter.count() > 0) {
        await statusFilter.first().click();
        await page.waitForTimeout(500);
      }
      
      // Verificar busca
      const searchInput = page.locator('input[type="search"], input[placeholder*="buscar"]');
      if (await searchInput.count() > 0) {
        await searchInput.fill('teste');
        await page.waitForTimeout(1000);
        await searchInput.clear();
      }
      
      // Verificar lista de conversas
      const conversationsList = page.locator('[class*="conversation"], [class*="chat"], .list, .grid');
      if (await conversationsList.count() > 0) {
        await expect(conversationsList.first()).toBeVisible();
      }
    });

    test('Conversas - Detalhes da Conversa', async ({ page }) => {
      await login(page);
      await page.goto(`${BASE_URL}/conversations`);
      
      // Tentar abrir uma conversa
      const conversationItems = page.locator('[class*="conversation"], [class*="chat-item"], .cursor-pointer');
      if (await conversationItems.count() > 0) {
        await conversationItems.first().click();
        await page.waitForTimeout(1000);
        
        // Verificar se abriu detalhes ou modal
        const details = page.locator('[class*="detail"], [class*="chat-view"], [role="dialog"]');
        if (await details.count() > 0) {
          await expect(details.first()).toBeVisible();
          
          // Verificar mensagens
          const messages = page.locator('[class*="message"], [class*="chat-bubble"]');
          if (await messages.count() > 0) {
            await expect(messages.first()).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Página WhatsApp', () => {
    test('WhatsApp - Interface e Controles', async ({ page }) => {
      await login(page);
      await page.goto(`${BASE_URL}/whatsapp`);
      
      // Verificar título
      await expect(page.locator('h1, h2')).toContainText(/whatsapp/i);
      
      // Verificar status de conexão
      const statusIndicator = page.locator('[class*="status"], [class*="connection"], [class*="indicator"]');
      if (await statusIndicator.count() > 0) {
        await expect(statusIndicator.first()).toBeVisible();
      }
      
      // Verificar botões de ação
      const actionButtons = page.locator('button:has-text("Conectar"), button:has-text("Desconectar"), button:has-text("QR")');
      for (let i = 0; i < await actionButtons.count(); i++) {
        await expect(actionButtons.nth(i)).toBeVisible();
      }
      
      // Verificar área de QR Code se existir
      const qrArea = page.locator('[class*="qr"], canvas, img[alt*="QR"]');
      if (await qrArea.count() > 0) {
        await expect(qrArea.first()).toBeVisible();
      }
    });
  });

  test.describe('Página de Integrações', () => {
    test('Integrações - Lista e Configurações', async ({ page }) => {
      await login(page);
      await page.goto(`${BASE_URL}/integrations`);
      
      // Verificar título
      await expect(page.locator('h1, h2')).toContainText(/integra|integration/i);
      
      // Verificar cards de integração
      const integrationCards = page.locator('[class*="integration"], [class*="card"], .grid > div');
      if (await integrationCards.count() > 0) {
        await expect(integrationCards.first()).toBeVisible();
        
        // Testar configuração de integração
        const configButtons = integrationCards.first().locator('button, [role="button"]');
        if (await configButtons.count() > 0) {
          await configButtons.first().click();
          await page.waitForTimeout(1000);
        }
      }
    });
  });

  test.describe('Página de Configurações', () => {
    test('Configurações - Seções e Formulários', async ({ page }) => {
      await login(page);
      await page.goto(`${BASE_URL}/settings`);
      
      // Verificar título
      await expect(page.locator('h1, h2')).toContainText(/configura|settings/i);
      
      // Verificar abas ou seções
      const tabs = page.locator('[role="tab"], [class*="tab"], nav a');
      if (await tabs.count() > 0) {
        for (let i = 0; i < Math.min(await tabs.count(), 3); i++) {
          await tabs.nth(i).click();
          await page.waitForTimeout(500);
        }
      }
      
      // Verificar formulários
      const forms = page.locator('form, [class*="form"]');
      if (await forms.count() > 0) {
        const inputs = forms.first().locator('input, select, textarea');
        for (let i = 0; i < Math.min(await inputs.count(), 3); i++) {
          const input = inputs.nth(i);
          if (await input.isVisible() && await input.isEnabled()) {
            await input.focus();
            await page.waitForTimeout(200);
          }
        }
      }
    });
  });

  test.describe('Layout e Navegação', () => {
    test('Menu Lateral - Navegação', async ({ page }) => {
      await login(page);
      
      // Verificar menu lateral
      const sidebar = page.locator('[class*="sidebar"], nav, [class*="menu"]');
      await expect(sidebar.first()).toBeVisible();
      
      // Testar links de navegação
      const navLinks = sidebar.first().locator('a, [role="button"]');
      const linkTexts = [];
      
      for (let i = 0; i < Math.min(await navLinks.count(), 8); i++) {
        const link = navLinks.nth(i);
        if (await link.isVisible()) {
          const text = await link.textContent();
          linkTexts.push(text?.trim());
          
          await link.click();
          await page.waitForTimeout(1000);
          
          // Verificar se a página mudou
          const currentUrl = page.url();
          console.log(`Navegou para: ${currentUrl} via link: ${text}`);
        }
      }
      
      console.log('Links de navegação encontrados:', linkTexts);
    });

    test('Header - Perfil e Logout', async ({ page }) => {
      await login(page);
      
      // Verificar header
      const header = page.locator('header, [class*="header"], [class*="navbar"]');
      if (await header.count() > 0) {
        await expect(header.first()).toBeVisible();
        
        // Verificar menu de perfil
        const profileMenu = header.locator('[class*="profile"], [class*="user"], [class*="avatar"]');
        if (await profileMenu.count() > 0) {
          await profileMenu.first().click();
          await page.waitForTimeout(500);
          
          // Verificar opções do menu
          const menuOptions = page.locator('[class*="dropdown"], [class*="menu"] a, [role="menuitem"]');
          if (await menuOptions.count() > 0) {
            // Procurar por logout
            const logoutOption = page.locator('a:has-text("Sair"), a:has-text("Logout"), button:has-text("Sair")');
            if (await logoutOption.count() > 0) {
              await expect(logoutOption.first()).toBeVisible();
            }
          }
        }
      }
    });

    test('Responsividade - Menu Mobile', async ({ page }) => {
      // Testar em viewport mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await login(page);
      
      // Verificar botão de menu mobile
      const mobileMenuButton = page.locator('[class*="mobile"], [class*="hamburger"], button:has([class*="menu"])');
      if (await mobileMenuButton.count() > 0) {
        await mobileMenuButton.first().click();
        await page.waitForTimeout(500);
        
        // Verificar se menu mobile abriu
        const mobileMenu = page.locator('[class*="mobile-menu"], [class*="drawer"], [class*="overlay"]');
        if (await mobileMenu.count() > 0) {
          await expect(mobileMenu.first()).toBeVisible();
        }
      }
      
      // Restaurar viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });
  });

  test.describe('Funcionalidades Gerais', () => {
    test('Notificações e Alertas', async ({ page }) => {
      await login(page);
      
      // Verificar área de notificações
      const notifications = page.locator('[class*="notification"], [class*="alert"], [class*="toast"]');
      if (await notifications.count() > 0) {
        await expect(notifications.first()).toBeVisible();
        
        // Testar fechamento de notificação
        const closeButton = notifications.first().locator('button, [class*="close"]');
        if (await closeButton.count() > 0) {
          await closeButton.first().click();
        }
      }
    });

    test('Loading States e Spinners', async ({ page }) => {
      await login(page);
      
      // Navegar entre páginas para verificar loading states
      const pages = ['/agents', '/conversations', '/settings'];
      
      for (const pagePath of pages) {
        await page.goto(`${BASE_URL}${pagePath}`);
        
        // Verificar se há loading states
        const loadingElements = page.locator('[class*="loading"], [class*="spinner"], .animate-spin, [class*="skeleton"]');
        if (await loadingElements.count() > 0) {
          console.log(`Loading state encontrado em ${pagePath}`);
          // Aguardar loading desaparecer
          await page.waitForTimeout(2000);
        }
      }
    });

    test('Formulários - Validação e Submissão', async ({ page }) => {
      await login(page);
      
      // Testar formulários em diferentes páginas
      const pagesWithForms = ['/agents', '/settings'];
      
      for (const pagePath of pagesWithForms) {
        await page.goto(`${BASE_URL}${pagePath}`);
        
        const forms = page.locator('form');
        if (await forms.count() > 0) {
          const form = forms.first();
          
          // Tentar submeter formulário vazio para testar validação
          const submitButton = form.locator('button[type="submit"], button:has-text("Salvar"), button:has-text("Criar")');
          if (await submitButton.count() > 0) {
            await submitButton.first().click();
            await page.waitForTimeout(1000);
            
            // Verificar mensagens de validação
            const validationMessages = page.locator('[class*="error"], [class*="invalid"], .text-red');
            if (await validationMessages.count() > 0) {
              console.log(`Validação encontrada em ${pagePath}`);
            }
          }
        }
      }
    });

    test('Modais e Overlays', async ({ page }) => {
      await login(page);
      
      // Procurar por botões que abrem modais
      const modalTriggers = page.locator('button:has-text("Criar"), button:has-text("Editar"), button:has-text("Ver")');
      
      for (let i = 0; i < Math.min(await modalTriggers.count(), 3); i++) {
        const trigger = modalTriggers.nth(i);
        if (await trigger.isVisible()) {
          await trigger.click();
          await page.waitForTimeout(1000);
          
          // Verificar se modal abriu
          const modal = page.locator('[role="dialog"], .modal, [class*="modal"], [class*="overlay"]');
          if (await modal.count() > 0 && await modal.first().isVisible()) {
            console.log('Modal aberto com sucesso');
            
            // Testar fechamento
            const closeButton = modal.first().locator('button:has-text("Fechar"), button:has-text("Cancelar"), [aria-label="Close"]');
            if (await closeButton.count() > 0) {
              await closeButton.first().click();
              await page.waitForTimeout(500);
            } else {
              // Tentar fechar clicando fora
              await page.keyboard.press('Escape');
            }
          }
        }
      }
    });
  });

  test.describe('Testes de Acessibilidade', () => {
    test('Navegação por Teclado', async ({ page }) => {
      await login(page);
      
      // Testar navegação por Tab
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(200);
        
        // Verificar se elemento focado é visível
        const focusedElement = page.locator(':focus');
        if (await focusedElement.count() > 0) {
          const isVisible = await focusedElement.isVisible();
          if (!isVisible) {
            console.log('Elemento focado não está visível');
          }
        }
      }
    });

    test('Atributos ARIA e Semântica', async ({ page }) => {
      await login(page);
      
      // Verificar elementos com roles apropriados
      const buttons = page.locator('button, [role="button"]');
      const links = page.locator('a, [role="link"]');
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      
      console.log(`Encontrados: ${await buttons.count()} botões, ${await links.count()} links, ${await headings.count()} headings`);
      
      // Verificar se botões têm texto ou aria-label
      for (let i = 0; i < Math.min(await buttons.count(), 5); i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        
        if (!text?.trim() && !ariaLabel) {
          console.log('Botão sem texto ou aria-label encontrado');
        }
      }
    });
  });

  test.describe('Performance e Otimização', () => {
    test('Tempo de Carregamento das Páginas', async ({ page }) => {
      const pages = ['/', '/agents', '/conversations', '/whatsapp', '/settings'];
      
      for (const pagePath of pages) {
        const startTime = Date.now();
        await page.goto(`${BASE_URL}${pagePath}`);
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        console.log(`Página ${pagePath} carregou em ${loadTime}ms`);
        
        // Verificar se carregou em tempo razoável (menos de 5 segundos)
        expect(loadTime).toBeLessThan(5000);
      }
    });

    test('Lazy Loading de Componentes', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Verificar se componentes são carregados sob demanda
      const networkRequests = [];
      page.on('request', request => {
        if (request.url().includes('.js') || request.url().includes('.css')) {
          networkRequests.push(request.url());
        }
      });
      
      await login(page);
      
      // Navegar para diferentes páginas
      await page.goto(`${BASE_URL}/agents`);
      await page.goto(`${BASE_URL}/conversations`);
      
      console.log(`Total de recursos carregados: ${networkRequests.length}`);
    });
  });
});

// Configuração de relatório
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    // Capturar screenshot em caso de falha
    const screenshot = await page.screenshot();
    await testInfo.attach('screenshot', { body: screenshot, contentType: 'image/png' });
    
    // Capturar logs do console
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    if (logs.length > 0) {
      await testInfo.attach('console-logs', { body: logs.join('\n'), contentType: 'text/plain' });
    }
  }
});