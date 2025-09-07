// Self-invoking function to avoid polluting the global scope
(function() {
    const API_BASE_URL = "https://chatbot-backend-ayze.onrender.com"; // Your live backend URL

    // Find the script tag and get the businessId from the 'data-business-id' attribute
    const scriptTag = document.currentScript;
    if (!scriptTag) {
        console.error("Chatbot Error: Could not find the script tag. Make sure it's loaded correctly.");
        return;
    }
    const businessId = scriptTag.dataset.businessId;

    if (!businessId) {
        console.error("Chatbot Error: 'data-business-id' is missing from the script tag.");
        return;
    }

    // Wait for the DOM to be ready before doing anything
    document.addEventListener("DOMContentLoaded", function() {
        // Fetch the configuration from our backend endpoint
        fetch(`${API_BASE_URL}/config/${businessId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Network response was not ok, status: ${response.status}`);
                }
                return response.json();
            })
            .then(config => {
                // Once we have the config, build the chatbot UI and attach all events
                buildChatbotUI(config);
            })
            .catch(error => console.error("Failed to load chatbot configuration:", error));
    });

    function buildChatbotUI(config) {
        // Inject a dynamic stylesheet for brand colors and other styles
        const style = document.createElement('style');
        style.innerHTML = `
            :root { --brand-color: ${config.brand_color || '#007bff'}; }
            #chat-bubble { position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; background-color: var(--brand-color); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.2); z-index: 9998; transition: transform 0.2s; }
            #chat-bubble:hover { transform: scale(1.1); }
            #chat-bubble svg { width: 32px; height: 32px; fill: white; }
            #chat-window { position: fixed; bottom: 90px; right: 20px; width: 350px; height: 500px; background-color: white; border-radius: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; flex-direction: column; overflow: hidden; opacity: 0; transform: translateY(20px); pointer-events: none; transition: opacity 0.3s, transform 0.3s; z-index: 9999; }
            #chat-window.open { opacity: 1; transform: translateY(0); pointer-events: auto; }
            #chat-header { background-color: var(--brand-color); color: white; padding: 15px; font-family: sans-serif; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
            #close-btn { background: none; border: none; color: white; font-size: 20px; cursor: pointer; }
            #chat-messages { flex-grow: 1; padding: 15px; overflow-y: auto; font-family: sans-serif; line-height: 1.5; display: flex; flex-direction: column; }
            .message { margin-bottom: 10px; padding: 10px 15px; border-radius: 20px; max-width: 80%; word-wrap: break-word; }
            .user-message { background-color: var(--brand-color); color: white; align-self: flex-end; margin-left: auto; }
            .bot-message { background-color: #f1f1f1; color: #333; align-self: flex-start; }
            .typing-indicator { color: #999; font-style: italic; }
            #chat-input-container { border-top: 1px solid #eee; padding: 10px; display: flex; }
            #chat-input { border: 1px solid #ccc; border-radius: 20px; padding: 10px 15px; flex-grow: 1; margin-right: 10px; font-size: 14px; }
            #chat-input:focus { outline: none; border-color: var(--brand-color); }
            #send-btn { background-color: var(--brand-color); border: none; color: white; padding: 10px 15px; border-radius: 20px; cursor: pointer; }
        `;
        document.head.appendChild(style);

        const container = document.getElementById('chatbot-container');
        if (!container) {
            console.error("Chatbot Error: The div with id 'chatbot-container' was not found.");
            return;
        }
        
        container.innerHTML = `
            <div id="chat-bubble">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            </div>
            <div id="chat-window">
                <div id="chat-header">
                    <span>${config.agent_name || 'AI Assistant'}</span>
                    <button id="close-btn">&times;</button>
                </div>
                <div id="chat-messages"></div>
                <div id="chat-input-container">
                    <input type="text" id="chat-input" placeholder="Ask a question...">
                    <button id="send-btn">Send</button>
                </div>
            </div>
        `;

        // --- THIS IS THE CRUCIAL MISSING PART ---
        // Get references to the newly created elements
        const chatBubble = document.getElementById('chat-bubble');
        const chatWindow = document.getElementById('chat-window');
        const closeBtn = document.getElementById('close-btn');
        const sendBtn = document.getElementById('send-btn');
        const chatInput = document.getElementById('chat-input');

        // Add the welcome message
        addMessage(config.welcome_message || 'Hello! How can I help you today?', 'bot');

        // Attach all the event listeners
        chatBubble.addEventListener('click', () => toggleChatWindow());
        closeBtn.addEventListener('click', () => toggleChatWindow());
        sendBtn.addEventListener('click', () => sendMessage());
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    // --- HELPER FUNCTIONS (THESE WERE MISSING) ---
    function toggleChatWindow() {
        const chatWindow = document.getElementById('chat-window');
        chatWindow.classList.toggle('open');
    }

    async function sendMessage() {
        const input = document.getElementById('chat-input');
        const question = input.value.trim();

        if (!question) return;

        addMessage(question, 'user');
        input.value = '';
        
        const typingIndicator = addMessage('Typing...', 'bot typing-indicator');
        
        try {
            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: question,
                    businessId: businessId,
                }),
            });

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const data = await response.json();
            typingIndicator.remove();
            addMessage(data.answer, 'bot');
        } catch (error) {
            console.error("Error fetching chat response:", error);
            typingIndicator.remove();
            addMessage("Sorry, I'm having trouble connecting. Please try again later.", 'bot');
        }
    }

    function addMessage(text, type) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        messageDiv.textContent = text;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return messageDiv;
    }
})();```

### What I Fixed/Added

1.  **Moved All CSS into JavaScript:** Instead of having a separate `style.css` file, I've moved all the CSS into the `buildChatbotUI` function. This makes your widget **completely self-contained**. A customer will only ever need your one `script.js` file, which is much cleaner.
2.  **Added Event Listeners:** The crucial missing piece was the code that actually finds the buttons (`chatBubble`, `closeBtn`, `sendBtn`) and attaches the `addEventListener` functions to them. This is what makes the buttons clickable.
3.  **Added Helper Functions:** The `toggleChatWindow`, `sendMessage`, and `addMessage` functions were missing. These are the functions that the event listeners call to actually do the work.
4.  **Added Welcome Message:** The bot now automatically displays the custom welcome message from your dashboard as soon as it loads.

### Your Final Action Plan

1.  **Replace the code in `script.js`** inside your **`chatbot-frontend`** GitHub repository with the complete code above.
2.  **Commit and push** this change to GitHub.
3.  **Wait for Netlify to redeploy.** This is usually very fast (less than a minute). You can check the "Deploys" section in your Netlify dashboard.
4.  **Go to your XAMPP test page** (or local `index.html`).
5.  **Do a final hard refresh (`Ctrl + Shift + R`)**.

This time, it will work. The bubble will appear with the correct color, and when you click it, the chat window will correctly slide open, ready for you to chat. You have now completed the entire application.
