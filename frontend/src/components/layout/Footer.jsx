import React from 'react'
import Icon from '@/components/icons/Icon'

const Footer = ({ compact = false }) => {
  if (compact) {
    return (
      <footer className="bg-dillaDarkGreen text-white text-xs py-4 px-6 border-t border-white/10 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <img
              src="/dilla-logo.png"
              alt="Dilla University Logo"
              className="w-6 h-6 object-contain bg-white rounded-md p-0.5"
            />
            <span className="font-semibold text-white">Dilla University</span>
            <span className="text-dillaGold text-[11px] italic hidden md:inline">
              • University of the Green Land
            </span>
          </div>
          <p className="text-white/70 text-[11px]">
            © {new Date().getFullYear()} Dilla University Cost-Sharing Portal. All rights reserved.
          </p>
        </div>
      </footer>
    )
  }

  return (
    <footer className="bg-dillaDarkGreen text-white border-t-2 border-dillaGold mt-12 print:hidden">
      {/* Top Footer Widget Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: University Identity */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-xl p-1.5 shadow-sm inline-block">
                <img
                  src="/dilla-logo.png"
                  alt="Dilla University Crest"
                  className="w-12 h-12 object-contain"
                />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-white tracking-tight leading-tight">
                  DILLA UNIVERSITY
                </h3>
                <p className="text-xs text-dillaGold font-serif font-medium">ዲላ ዩኒቨርሲቲ</p>
                <p className="text-[11px] text-emerald-300 italic font-medium">
                  "University of the Green Land"
                </p>
              </div>
            </div>
            <p className="text-xs text-white/80 leading-relaxed pt-1">
              Official Online Cost-Sharing Registration and Student Subsidy Verification System for non-cafeteria student beneficiaries.
            </p>
            <div className="pt-2 text-xs text-emerald-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Secure University Portal • du.edu.et</span>
            </div>
          </div>

          {/* Col 2: Services & Fast Links */}
          <div>
            <h4 className="text-xs font-bold text-dillaGold uppercase tracking-wider mb-3">
              Cost-Sharing Services
            </h4>
            <ul className="space-y-2 text-xs text-white/80">
              <li>
                <a
                  href="/student/register"
                  className="hover:text-dillaGold transition-colors inline-flex items-center gap-1.5"
                >
                  <span>→</span> Non-Cafeteria Subsidy Registration
                </a>
              </li>
              <li>
                <a
                  href="/"
                  className="hover:text-dillaGold transition-colors inline-flex items-center gap-1.5"
                >
                  <span>→</span> Application Status Verification
                </a>
              </li>
              <li>
                <a
                  href="https://www.du.edu.et"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-dillaGold transition-colors inline-flex items-center gap-1.5"
                >
                  <span>→</span> Dilla University Official Website
                </a>
              </li>
              <li>
                <a
                  href="/login"
                  className="hover:text-dillaGold transition-colors inline-flex items-center gap-1.5"
                >
                  <span>→</span> Staff & Dean Portal Login
                </a>
              </li>
              <li>
                <span className="text-white/50 inline-flex items-center gap-1.5">
                  <span>→</span> Registrar Cost-Sharing Regulations
                </span>
              </li>
            </ul>
          </div>

          {/* Col 3: Campuses */}
          <div>
            <h4 className="text-xs font-bold text-dillaGold uppercase tracking-wider mb-3">
              University Campuses
            </h4>
            <ul className="space-y-2 text-xs text-white/80">
              <li className="flex items-start gap-2">
                <Icon name="map-pin" className="w-3.5 h-3.5 text-dillaGold mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white font-medium">Main Campus</strong>
                  <p className="text-[11px] text-white/60">Odeaya / Dilla City, South Ethiopia</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="map-pin" className="w-3.5 h-3.5 text-dillaGold mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white font-medium">Odaya Campus</strong>
                  <p className="text-[11px] text-white/60">College of Health Sciences & Referral Hospital</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="map-pin" className="w-3.5 h-3.5 text-dillaGold mt-0.5 flex-shrink-0" />
                <div>
                  <strong className="text-white font-medium">Haru Campus</strong>
                  <p className="text-[11px] text-white/60">College of Agriculture & Natural Resources</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact Information */}
          <div>
            <h4 className="text-xs font-bold text-dillaGold uppercase tracking-wider mb-3">
              Registrar & Support
            </h4>
            <ul className="space-y-2 text-xs text-white/80">
              <li className="flex items-center gap-2">
                <Icon name="phone" className="w-3.5 h-3.5 text-dillaGold flex-shrink-0" />
                <span>+251 46 131 0001 / +251 92 498 6488</span>
              </li>
              <li className="flex items-center gap-2">
                <Icon name="mail" className="w-3.5 h-3.5 text-dillaGold flex-shrink-0" />
                <a href="mailto:info@du.edu.et" className="hover:text-dillaGold transition-colors">
                  info@du.edu.et
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Icon name="mail" className="w-3.5 h-3.5 text-dillaGold flex-shrink-0" />
                <a href="mailto:registrar@du.edu.et" className="hover:text-dillaGold transition-colors">
                  registrar@du.edu.et
                </a>
              </li>
              <li className="flex items-start gap-2 pt-1 text-white/60 text-[11px]">
                <Icon name="clock" className="w-3.5 h-3.5 text-dillaGold mt-0.5 flex-shrink-0" />
                <span>Office Hours: Monday - Friday, 8:30 AM - 5:30 PM (EAT)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Copyright Strip */}
      <div className="bg-[#082517] py-4 px-4 sm:px-6 lg:px-8 border-t border-white/10 text-xs text-white/70">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p>
            © {new Date().getFullYear()} Dilla University. All Rights Reserved. Online Cost-Sharing Registration System.
          </p>
          <div className="flex items-center gap-4 text-[11px] text-white/60">
            <span>P.O. Box 419, Dilla, Ethiopia</span>
            <span>•</span>
            <span className="text-dillaGold font-medium">South Ethiopia Regional State</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
