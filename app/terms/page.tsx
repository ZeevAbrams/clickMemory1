export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-background to-secondary-light p-4">
      <div className="max-w-4xl mx-auto bg-card rounded-3xl shadow-card border border-custom p-8">
        <h1 className="text-3xl font-bold text-text-primary mb-6">Terms and Conditions</h1>
        
        <p className="text-secondary mb-6"><strong>Last updated:</strong> December 2024</p>
        
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 mb-8">
          <strong className="text-yellow-400">Important:</strong> 
          <span className="text-yellow-300"> ClickMemory is designed with your privacy as the top priority. We do not sell, share, or view your data. Your data remains completely under your control.</span>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">1. Acceptance of Terms</h2>
            <p className="text-secondary">By using the ClickMemory browser extension, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the extension.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">2. Service Description</h2>
            <p className="text-secondary">ClickMemory is a browser extension that allows you to save and organize text snippets and code fragments. The extension works with your personal API keys to store data securely.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">3. Data Privacy and Security</h2>
            <ul className="list-disc list-inside text-secondary space-y-1 ml-4">
              <li><strong>No Data Access:</strong> We do not have access to, view, or store your personal data or snippets.</li>
              <li><strong>Your API Keys:</strong> All data is stored using your own API keys and credentials.</li>
              <li><strong>No Data Sharing:</strong> We do not sell, share, or transfer your data to any third parties.</li>
              <li><strong>Local Processing:</strong> Data processing occurs locally in your browser or through your own API endpoints.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">4. User Responsibilities</h2>
            <ul className="list-disc list-inside text-secondary space-y-1 ml-4">
              <li>You are responsible for maintaining the security of your API keys.</li>
              <li>You are responsible for the content you save using the extension.</li>
              <li>You must comply with all applicable laws and regulations.</li>
              <li>You must not use the extension for any illegal or harmful purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">5. Limitation of Liability</h2>
            <p className="text-secondary">ClickMemory is provided &quot;as is&quot; without any warranties. We are not liable for any damages arising from the use of this extension, including but not limited to data loss, security breaches, or any other issues.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">6. Changes to Terms</h2>
            <p className="text-secondary">We reserve the right to modify these terms at any time. Continued use of the extension after changes constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">7. Contact</h2>
            <p className="text-secondary">If you have any questions about these Terms and Conditions, please contact us through the extension&apos;s support channels.</p>
          </section>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 mt-8">
          <strong className="text-yellow-400">Your Privacy Matters:</strong> 
          <span className="text-yellow-300"> We believe in transparency and user control. Your data belongs to you, and we&apos;re committed to keeping it that way.</span>
        </div>
      </div>
    </div>
  )
} 