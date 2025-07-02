export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-background to-secondary-light p-4">
      <div className="max-w-4xl mx-auto bg-card rounded-3xl shadow-card border border-custom p-8">
        <h1 className="text-3xl font-bold text-text-primary mb-6">Privacy Policy</h1>
        
        <p className="text-secondary mb-6"><strong>Last updated:</strong> December 2024</p>
        
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 mb-8">
          <strong className="text-blue-400">Our Commitment:</strong> 
          <span className="text-blue-300"> ClickMemory is built on the principle that your data belongs to you. While your data is stored securely in Supabase, we do not access, view, or use your personal information or snippets.</span>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">1. Information We Do NOT Access</h2>
            <p className="text-secondary mb-3">ClickMemory is designed with privacy-first principles. While your data is stored in Supabase, we do not access, view, or process:</p>
            <ul className="list-disc list-inside text-secondary space-y-1 ml-4">
              <li>Your text snippets or code fragments</li>
              <li>Your API keys or credentials</li>
              <li>Your browsing history or website data</li>
              <li>Personal information or identifiers</li>
              <li>Usage analytics or tracking data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">2. How Data is Handled</h2>
            <ul className="list-disc list-inside text-secondary space-y-1 ml-4">
              <li><strong>Secure Storage:</strong> Your data is stored securely in Supabase using your own API keys</li>
              <li><strong>Your API Keys:</strong> Data access is controlled entirely by your own API keys and credentials</li>
              <li><strong>No Data Access:</strong> We do not access, view, or use your stored data</li>
              <li><strong>Direct Communication:</strong> The extension communicates directly with Supabase using your credentials</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">3. Data Security</h2>
            <p className="text-secondary mb-3">Your data is stored securely in Supabase, but we do not have access to it. To maintain security:</p>
            <ul className="list-disc list-inside text-secondary space-y-1 ml-4">
              <li>Keep your API keys secure and private</li>
              <li>Use strong, unique passwords for your accounts</li>
              <li>Be aware that Supabase&apos;s security practices protect your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">4. Third-Party Services</h2>
            <p className="text-secondary">ClickMemory uses Supabase as a storage provider. While we do not access your data stored there, please review Supabase&apos;s privacy policy and security practices. We are not responsible for Supabase&apos;s privacy practices.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">5. Browser Permissions</h2>
            <p className="text-secondary mb-3">The extension requires certain browser permissions to function:</p>
            <ul className="list-disc list-inside text-secondary space-y-1 ml-4">
              <li><strong>Active Tab Access:</strong> To read selected text from web pages</li>
              <li><strong>Storage:</strong> To save your API keys and settings locally</li>
              <li><strong>Network Requests:</strong> To communicate with Supabase</li>
            </ul>
            <p className="text-secondary mt-3">These permissions are used only for the stated purposes and are not used to collect personal information.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">6. Data Retention</h2>
            <p className="text-secondary">Your data retention is controlled by your Supabase account settings and your own data management practices. We do not control or access your stored data.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">7. Your Rights</h2>
            <p className="text-secondary mb-3">Since we do not access your personal data, traditional data subject rights (like deletion requests) do not apply to us. However, you can:</p>
            <ul className="list-disc list-inside text-secondary space-y-1 ml-4">
              <li>Uninstall the extension at any time</li>
              <li>Clear your browser&apos;s local storage to remove saved settings</li>
              <li>Manage your data directly through your Supabase account</li>
              <li>Revoke API keys from your Supabase account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">8. Children&apos;s Privacy</h2>
            <p className="text-secondary">ClickMemory is not intended for use by children under 13. Since we do not access personal information, we do not knowingly access information from children under 13.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">9. Changes to This Policy</h2>
            <p className="text-secondary">We may update this privacy policy from time to time. We will notify users of any material changes through the extension or our website.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">10. Contact Us</h2>
            <p className="text-secondary">If you have any questions about this privacy policy, please contact us through the extension&apos;s support channels.</p>
          </section>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 mt-8">
          <strong className="text-yellow-400">Important Note:</strong> 
          <span className="text-yellow-300"> While we do not access your data, your data is stored in Supabase. Please review Supabase&apos;s privacy policies and security practices to understand how your data is protected.</span>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 mt-6">
          <strong className="text-blue-400">Transparency Promise:</strong> 
          <span className="text-blue-300"> We believe in complete transparency about our data practices. Your data is stored securely but remains completely under your control - we do not access, view, or use it.</span>
        </div>
      </div>
    </div>
  )
} 