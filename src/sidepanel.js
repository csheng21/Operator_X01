/*
Date 27/1/2025
By: Heng CS
Log:
1. Add Save Page functionality with Deepseek integration
1.1. Add chat history support
1.2. Fix page feedback text length
1.3. Add loading indicator
1.4. Add timestamps for messages
1.5. Fix language switching and response consistency
1.6. Add beta warning for page analysis
*/

let messageHistory = [];
let currentLanguage = 'en'; // Set default to English
const systemPrompts = {
    'en': 'You are a helpful assistant. You must respond only in English.',
    'zh': '您是一位专业的助手。您必须只使用中文回答。',
    'ms': 'Anda adalah pembantu yang profesional. Anda mesti menjawab dalam Bahasa Melayu sahaja.'
};

document.addEventListener('DOMContentLoaded', () => {
    const welcomeMessages = {
        'en': 'Hello! How can I assist you today?',
        'zh': '你好！我能为您做些什么？',
        'ms': 'Hai! Apa yang boleh saya bantu hari ini?'
    };

        const updatePlaceholder = () => {
        const placeholders = {
            'en': 'Enter message or what to analyze...',
            'zh': '输入消息或要分析的内容...',
            'ms': 'Masukkan mesej atau apa yang hendak dianalisis...'
        };
        document.getElementById("userInput").placeholder = placeholders[currentLanguage];
    };


    // Show initial welcome message only if history is empty
    if (messageHistory.length === 0) {
        messageHistory.push({
            role: 'assistant',
            content: welcomeMessages[currentLanguage],
            timestamp: new Date().toISOString()
        });
        displayConversation();
    }

    // Add event listeners
    document.getElementById("sendButton").addEventListener("click", getChatGPTResponse);
    document.getElementById("savePageButton").addEventListener("click", savePage);

    // Language selector handlers
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentLanguage = btn.dataset.lang;
            updatePlaceholder(); // Update placeholder when language changes
            displayConversation();
        });
    });

    // Initial placeholder setup
    updatePlaceholder();

    // Add Enter key listener for input
    document.getElementById("userInput").addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            getChatGPTResponse();
        }
    });
});

async function getChatGPTResponse() {
    const userInput = document.getElementById("userInput").value;
    if (!userInput.trim()) return;

    try {
        messageHistory.push({
            role: "user",
            content: userInput,
            timestamp: new Date().toISOString()
        });
        displayConversation();
        showLoading();

        const messages = [
            {
                role: "system",
                content: systemPrompts[currentLanguage]
            },
            {
                role: "system",
                content: `You must respond only in ${
                    currentLanguage === 'en' ? 'English' :
                    currentLanguage === 'zh' ? 'Chinese (中文)' :
                    'Bahasa Melayu'
                }. Do not use any other language.`
            },
            ...messageHistory.filter(msg => msg.role !== "system")
        ];

        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `/*API Key*/`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: messages,
                max_tokens: 2000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            hideLoading();
            const errorData = await response.json();
            throw new Error(`API request failed: ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        hideLoading();
        messageHistory.push({
            role: "assistant",
            content: data.choices[0].message.content,
            timestamp: new Date().toISOString()
        });
        displayConversation();
        document.getElementById("userInput").value = "";
    } catch (error) {
        hideLoading();
        console.error("Full error:", error);
        document.getElementById("response").innerText = "Error: " + error.message;
    }
}

async function savePage() {
    const statusDiv = document.getElementById("saveStatus");
    const inputField = document.getElementById("userInput");
    const userInput = inputField.value.trim();
    let isAnalyzing = false;

    try {
        // Prevent multiple analyses
        if (isAnalyzing) {
            return;
        }

        // Require user input
        if (!userInput) {
            const warningMessages = {
                'en': 'Please enter what aspects of the page you want to analyze.',
                'zh': '请输入您想分析网页的哪些方面。',
                'ms': 'Sila masukkan aspek laman yang anda ingin analisis.'
            };

            messageHistory.push({
                role: "assistant",
                content: warningMessages[currentLanguage],
                timestamp: new Date().toISOString()
            });
            displayConversation();
            return;
        }

        isAnalyzing = true;
        inputField.value = "";
        hideLoading();
        statusDiv.textContent = "";

        // Show beta warning
        const betaWarnings = {
            'en': 'Note: Page analysis feature is in beta. Some functionality may be limited.',
            'zh': '注意：网页分析功能仍在测试阶段，部分功能可能不够完善。',
            'ms': 'Nota: Ciri analisis laman masih dalam versi beta. Sesetengah fungsi mungkin terhad.'
        };

        messageHistory.push({
            role: "assistant",
            content: betaWarnings[currentLanguage],
            timestamp: new Date().toISOString()
        });
        displayConversation();
        showLoading();

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            throw new Error('No active tab found');
        }

        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                try {
                    const cleanText = (text) => {
                        return text
                            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
                            .replace(/\s+/g, ' ')
                            .trim();
                    };

                    const mainContent = cleanText(document.body.innerText);
                    return {
                        title: cleanText(document.title).substring(0, 200),
                        content: mainContent.substring(0, 6000),
                        url: window.location.href
                    };
                } catch (e) {
                    return { error: e.message };
                }
            }
        });

        if (!result?.[0]?.result || result[0].result.error) {
            throw new Error(result?.[0]?.result?.error || 'Failed to capture page content');
        }

        const pageData = result[0].result;
        statusDiv.textContent = "Analyzing page...";

        // Create targeted analysis prompt based on user input
        const basePrompts = {
            'en': `Please analyze this webpage focusing specifically on: ${userInput}. From the page ${pageData.url}, provide detailed analysis about:`,
            'zh': `请针对以下方面分析此网页：${userInput}。对于来自 ${pageData.url} 的页面，请提供详细分析：`,
            'ms': `Sila analisis laman web ini dengan fokus khusus pada: ${userInput}. Dari laman ${pageData.url}, berikan analisis terperinci tentang:`
        };

        const analysisPrompt = `${basePrompts[currentLanguage]}\n\nContent: ${pageData.content}`;

        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer sk-93647fd677a6466d8afabb41e5f59115`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: systemPrompts[currentLanguage]
                    },
                    {
                        role: "system",
                        content: `You must respond only in ${
                            currentLanguage === 'en' ? 'English' :
                            currentLanguage === 'zh' ? 'Chinese (中文)' :
                            'Bahasa Melayu'
                        }. Provide detailed analysis focusing on the user's specific request.`
                    },
                    {
                        role: "user",
                        content: analysisPrompt
                    }
                ],
                max_tokens: 4000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API request failed');
        }

        const data = await response.json();

        // Show what's being analyzed
        messageHistory.push({
            role: "user",
            content: `Analyzing Page (Focus: ${userInput})`,
            timestamp: new Date().toISOString()
        });

        // Add the analysis response
        messageHistory.push({
            role: "assistant",
            content: data.choices[0].message.content,
            timestamp: new Date().toISOString()
        });

        hideLoading();
        displayConversation();
        statusDiv.textContent = "Analysis complete!";

    } catch (error) {
        console.error('Analysis error:', error);
        hideLoading();

        const errorMessages = {
            'en': 'Failed to analyze page. Please try again.',
            'zh': '页面分析失败，请重试。',
            'ms': 'Gagal menganalisis laman. Sila cuba lagi.'
        };

        messageHistory.push({
            role: "assistant",
            content: `${errorMessages[currentLanguage]} (${error.message})`,
            timestamp: new Date().toISOString()
        });
        displayConversation();
        statusDiv.textContent = errorMessages[currentLanguage];

    } finally {
        isAnalyzing = false;
        inputField.value = "";
    }
}


function showLoading() {
    const responseDiv = document.getElementById("response");
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingIndicator';
    loadingDiv.className = 'thinking-indicator';

    const thinkingText = {
        'en': 'Thinking',
        'zh': '思考中',
        'ms': 'Memproses'
    }[currentLanguage] || 'Thinking';

    loadingDiv.innerHTML = `
        <span>${thinkingText}</span>
        <div class="dot-animation">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;

    responseDiv.appendChild(loadingDiv);
    responseDiv.scrollTop = responseDiv.scrollHeight;
}

function hideLoading() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }
}

function displayConversation() {
    const responseDiv = document.getElementById("response");
    responseDiv.innerHTML = messageHistory.map(msg => {
        // Skip system messages in display
        if (msg.role === "system") return "";

        const role = msg.role === 'user' ? 'You' : 'Assistant';
        let content = msg.content;

        // Add timestamp if not exists
        if (!msg.timestamp) {
            msg.timestamp = new Date().toISOString();
        }

        // Format the timestamp based on current language
        const messageDate = new Date(msg.timestamp);
        let timeStr;
        switch(currentLanguage) {
            case 'zh':
                timeStr = `${messageDate.getHours()}:${String(messageDate.getMinutes()).padStart(2, '0')}`;
                break;
            case 'ms':
                timeStr = messageDate.toLocaleTimeString('ms-MY', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
                break;
            default:
                timeStr = messageDate.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
        }

        // Check if this is a beta warning message
        if (msg.role === 'assistant' && (
            content.includes('Page analysis feature is in beta') ||
            content.includes('网页分析功能仍在测试阶段') ||
            content.includes('Ciri analisis laman masih dalam versi beta')
        )) {
            return `
                <div class="message ${msg.role}">
                    <div class="message-header">${role} • ${timeStr}</div>
                    <div class="message-content beta-warning">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
                            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        ${content}
                    </div>
                </div>
            `;
        }

        // Shorten webpage analysis request
        if (msg.role === 'user' && content.includes('Please analyze this webpage from')) {
            const focus = content.includes('with focus on:') ?
                content.match(/with focus on: ([^Content:]+)/)[1].trim() :
                '';
            content = `Analyzing Page${focus ? ` (Focus: ${focus})` : ''}`;
        }

        // Format assistant responses
        if (msg.role === 'assistant') {
            content = content
                .replace(/--- ###/g, '<br><br><strong>Section</strong>')
                .replace(/\. -/g, '.<br>')
                .replace(/(\d+\.) /g, '<br><br>$1 ')
                .replace(/\*\*(.*?)\*\*/g, '<span class="highlight">$1</span>')
                .replace(/- \*\*(.*?)\*\*/g, '<br>• <strong>$1</strong>');
        }

        return `
            <div class="message ${msg.role}">
                <div class="message-header">${role} • ${timeStr}</div>
                <div class="message-content">${content}</div>
            </div>
        `;
    }).join('');

    responseDiv.scrollTop = responseDiv.scrollHeight;
}

// Rest of your code (showLoading and hideLoading functions) remains the same

function hideLoading() {
  const loadingIndicator = document.getElementById('loadingIndicator');
  if (loadingIndicator) {
    loadingIndicator.remove();
  }
}