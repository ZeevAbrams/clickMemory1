'use client'
import { BookOpen, Plus, MousePointer, Key, Download, CheckCircle, Settings } from 'lucide-react'
import Link from 'next/link'

export default function InstructionsPage() {
  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-4 flex items-center">
          <BookOpen className="h-8 w-8 mr-3" />
          How to Use ClickMemory Extension
        </h1>
        <p className="text-lg text-secondary">
          Follow these steps to set up and use the ClickMemory browser extension for quick access to your snippets.
        </p>
      </div>

      <div className="space-y-8">
        {/* Step 1 */}
        <div className="bg-card rounded-2xl p-6 shadow-card border border-custom">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <span className="text-primary font-bold text-lg">1</span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-primary mb-2 flex items-center">
                <Plus className="h-5 w-5 mr-2" />
                Create a New Snippet
              </h3>
              <p className="text-secondary mb-4">
                Start by creating a snippet that you want to access quickly from any webpage.
              </p>
              <Link
                href="/dashboard/new"
                className="inline-flex items-center px-4 py-2 bg-gradient-primary text-white rounded-xl hover:bg-primary-hover transition-all shadow-glow"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Snippet
              </Link>
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-card rounded-2xl p-6 shadow-card border border-custom">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <span className="text-primary font-bold text-lg">2</span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-primary mb-2 flex items-center">
                <MousePointer className="h-5 w-5 mr-2" />
                Select Your Snippet
              </h3>
              <p className="text-secondary mb-4">
                Choose which snippet you want to use with the extension. You can create multiple snippets and switch between them.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-gradient-primary text-white rounded-xl hover:bg-primary-hover transition-all shadow-glow"
              >
                View My Snippets
              </Link>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-card rounded-2xl p-6 shadow-card border border-custom">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <span className="text-primary font-bold text-lg">3</span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-primary mb-2 flex items-center">
                <Key className="h-5 w-5 mr-2" />
                Get Your API Key
              </h3>
              <p className="text-secondary mb-4">
                Generate an API key from the Settings page. This key will securely connect your extension to your ClickMemory account.
              </p>
              <Link
                href="/dashboard/settings"
                className="inline-flex items-center px-4 py-2 bg-gradient-primary text-white rounded-xl hover:bg-primary-hover transition-all shadow-glow"
              >
                <Key className="h-4 w-4 mr-2" />
                Go to Settings
              </Link>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="bg-card rounded-2xl p-6 shadow-card border border-custom">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <span className="text-primary font-bold text-lg">4</span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-primary mb-2 flex items-center">
                <Download className="h-5 w-5 mr-2" />
                Install the Extension
              </h3>
              <p className="text-secondary mb-4">
                Download and install the ClickMemory browser extension to access your snippets from any webpage.
              </p>
              <a
                href="https://github.com/ZeevAbrams/clickMemory_extension"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-gradient-primary text-white rounded-xl hover:bg-primary-hover transition-all shadow-glow"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Extension
              </a>
            </div>
          </div>
        </div>

        {/* Step 5 */}
        <div className="bg-card rounded-2xl p-6 shadow-card border border-custom">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <span className="text-primary font-bold text-lg">5</span>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-primary mb-2 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Configure the Extension
              </h3>
              <p className="text-secondary mb-4">
                Open the extension, paste your API key, and you're ready to right-click and access your snippets anywhere!
              </p>
              <div className="bg-secondary-light rounded-xl p-4 border border-custom">
                <p className="text-sm text-secondary">
                  <strong>Pro tip:</strong> Once configured, you can right-click on any webpage and select your snippet from the context menu for instant access.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Help Section */}
      <div className="mt-12 bg-gradient-to-r from-primary-light to-secondary-light rounded-2xl p-6 border border-custom">
        <h2 className="text-2xl font-bold text-primary mb-4">Need Help?</h2>
        <p className="text-secondary">
          If you need help, email us at <a href="mailto:info@iteraite.com" className="text-primary hover:underline">info@iteraite.com</a>
        </p>
      </div>
    </div>
  )
} 