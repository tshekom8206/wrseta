import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IconService } from '../../../core/services/icon.service';
import { AuthService } from '../../../core/auth/auth.service';

interface AvailableLearnership {
  id: number;
  title: string;
  code: string;
  nqfLevel: number;
  credits: number;
  duration: string;
  startDate: Date;
  applicationDeadline: Date;
  category: string;
  location: string;
  provider: string;
  description: string;
  requirements: string[];
  benefits: string[];
  isOpen: boolean;
  availableSpots: number;
  totalSpots: number;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="landing-page" style="min-height: 100vh;">
      <!-- Navigation -->
      <nav class="landing-nav">
        <div class="container">
          <div class="nav-wrapper">
            <div class="nav-logo">
              <img src="/assets/images/logos/WRSETA_logo-2.png" alt="W&RSETA Logo" class="logo-img">
            </div>
            <div class="nav-links">
              <a href="#home" class="nav-link">Home</a>
              <a href="#about" class="nav-link">About Us</a>
              <a href="#programmes" class="nav-link">Learnerships</a>
              <a href="#contact" class="nav-link">Contact Us</a>
              <a routerLink="/auth/login" class="nav-link nav-link-signin">Sign In</a>
            </div>
          </div>
        </div>
      </nav>

      <!-- Hero Section -->
      <section id="home" class="hero-section">
        <div class="hero-background"></div>
        <div class="hero-overlay"></div>
        <div class="container">
          <div class="hero-content-wrapper">
            <div class="hero-text">
              <h1 class="hero-title">Empowering South Africa's Wholesale & Retail Sector</h1>
              <p class="hero-subtitle">
                W&RSETA helps businesses and learners in the wholesale and retail sector access education and training opportunities, 
                enhancing their competitiveness and creating valuable career pathways.
              </p>
              <div class="hero-actions">
                <a routerLink="/auth/login" class="btn btn-primary btn-hero">Get Started</a>
                <a href="#about" class="btn btn-outline-hero">Learn More</a>
              </div>
            </div>
            @if (featuredLearnerships.length > 0) {
              <div class="hero-learnership-card">
                <div class="learnership-card-hero">
                  <div class="learnership-card-hero-header">
                    <span class="learnership-badge-hero">Featured Learnership</span>
                    <span class="learnership-code-hero">Code: {{ featuredLearnerships[0].code }}</span>
                  </div>
                  <div class="learnership-card-hero-body">
                    <h3 class="learnership-title-hero">{{ featuredLearnerships[0].title }}</h3>
                    <p class="learnership-description-hero">{{ featuredLearnerships[0].description }}</p>
                    <div class="learnership-meta-hero">
                      <div class="meta-item-hero">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <span>NQF Level {{ featuredLearnerships[0].nqfLevel }}</span>
                      </div>
                      <div class="meta-item-hero">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>{{ featuredLearnerships[0].duration }}</span>
                      </div>
                      <div class="meta-item-hero">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span>{{ featuredLearnerships[0].location }}</span>
                      </div>
                    </div>
                    <div class="learnership-footer-hero">
                      <div class="learnership-spots-hero">
                        <strong>{{ featuredLearnerships[0].availableSpots }}</strong> spots available
                      </div>
                      <a routerLink="/auth/login" class="btn btn-primary btn-sm">Apply Now</a>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="features-section">
        <div class="container">
          <div class="features-grid">
            <div class="feature-card">
              <div class="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </div>
              <h3 class="feature-title">Skills Development</h3>
              <p class="feature-description">
                Comprehensive learning programmes designed to enhance skills and competencies in the wholesale and retail sector.
              </p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <h3 class="feature-title">Grant Disbursement</h3>
              <p class="feature-description">
                Financial support through grants to enable skills development initiatives and training programmes.
              </p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <h3 class="feature-title">Learnerships</h3>
              <p class="feature-description">
                Access to learnership programmes that combine workplace experience with structured learning.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Call for Applications Section -->
      <section id="programmes" class="applications-section">
        <div class="container">
          <div class="applications-header-section">
            <h2 class="applications-title">Available Learnerships</h2>
            <p class="applications-intro">
              Explore current learnership opportunities available through W&RSETA accredited providers.
            </p>
          </div>
          <div class="learnerships-grid">
            @for (learnership of featuredLearnerships; track learnership.id) {
              <div class="learnership-card-featured">
                <div class="learnership-card-header">
                  <span class="learnership-badge-featured">{{ learnership.category }}</span>
                  <span class="learnership-code">Code: {{ learnership.code }}</span>
                </div>
                <div class="learnership-card-body">
                  <h3 class="learnership-title-featured">{{ learnership.title }}</h3>
                  <p class="learnership-description-featured">{{ learnership.description }}</p>
                  <div class="learnership-meta-featured">
                    <div class="meta-item-featured">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      <span>NQF Level {{ learnership.nqfLevel }}</span>
                    </div>
                    <div class="meta-item-featured">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <span>{{ learnership.duration }}</span>
                    </div>
                    <div class="meta-item-featured">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      <span>{{ learnership.location }}</span>
                    </div>
                  </div>
                  <div class="learnership-footer-featured">
                    <div class="learnership-spots">
                      <strong>{{ learnership.availableSpots }}</strong> spots available
                    </div>
                    <a routerLink="/auth/login" class="btn btn-primary btn-sm">Apply Now</a>
                  </div>
                </div>
              </div>
            }
          </div>
          <div class="applications-footer">
            <a routerLink="/auth/login" class="btn btn-outline-primary">
              View All Learnerships
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ms-2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </a>
          </div>
        </div>
      </section>

      <!-- About Section -->
      <section id="about" class="about-section">
        <div class="about-pattern"></div>
        <div class="container">
          <div class="about-content">
            <h2 class="section-title">About W&RSETA</h2>
            <div class="about-text">
              <h3 class="about-subtitle">Empowering South Africa's Wholesale & Retail Sector</h3>
              <p>
                The Wholesale and Retail Sector Education and Training Authority (W&RSETA) was established in 2000 in terms of 
                the Skills Development Act (as amended). As a public entity, our primary aim is to facilitate the skills development needs of 
                the Wholesale and Retail (W&R) Sector through the implementation of learning programmes, disbursement of grants, 
                and monitoring of education and training as outlined in the National Skills Development Plan (NSDP).
              </p>
            </div>
            
            <!-- Key Highlights -->
            <div class="about-highlights">
              <div class="highlight-card">
                <div class="highlight-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <h4 class="highlight-title">21 SETAs</h4>
                <p class="highlight-text">One of 21 SETAs servicing South Africa's economic sectors</p>
              </div>
              <div class="highlight-card">
                <div class="highlight-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                  </svg>
                </div>
                <h4 class="highlight-title">Since 2000</h4>
                <p class="highlight-text">Over two decades of skills development excellence</p>
              </div>
              <div class="highlight-card">
                <div class="highlight-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
                <h4 class="highlight-title">Grant Support</h4>
                <p class="highlight-text">Financial assistance for skills development initiatives</p>
              </div>
            </div>

            <div class="about-text">
              <p>
                We are one of 21 SETAs, each servicing a specific economic sector of South Africa, under the guidance of the 
                Department of Higher Education and Training. Our work is crucial in fostering a skilled and competitive workforce, 
                driving economic growth, and ensuring the sustainability of the W&R sector.
              </p>
              <p>
                W&RSETA assists businesses and learners in the wholesale and retail sector by providing financial and non-financial 
                support. We focus on enhancing the competitiveness of enterprises and individuals by offering capacity-building 
                workshops, training opportunities, and learnership programmes tailored to the sector's needs.
              </p>
              <p>
                Our goal is to contribute to the growth of the wholesale and retail sector by enabling businesses to expand their 
                capabilities, increase productivity, and create sustainable employment opportunities. By supporting small and 
                medium-sized enterprises (SMEs) and individual learners, we play a crucial role in driving economic development 
                and promoting skills development throughout South Africa.
              </p>
              <p>
                Through W&RSETA's initiatives, we aim to foster a vibrant and inclusive wholesale and retail sector that benefits 
                all South Africans. Our programmes are aligned with the National Development Plan and the National Skills 
                Development Strategy, prioritizing sustainable skills development, job creation, and sector transformation.
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Contact Section -->
      <section id="contact" class="contact-section">
        <div class="container">
          <h2 class="section-title text-center">Get In Touch</h2>
          <p class="section-subtitle text-center">
            Do you have any questions, queries, or concerns? Talk to us.
          </p>
          <div class="contact-info">
            <div class="contact-item">
              <div class="contact-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
              </div>
              <div class="contact-details">
                <h4 class="contact-label">Phone</h4>
                <p class="contact-value">012 622 9500</p>
              </div>
            </div>
            <div class="contact-item">
              <div class="contact-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>
              <div class="contact-details">
                <h4 class="contact-label">Email</h4>
                <p class="contact-value">info&#64;wrseta.org.za</p>
              </div>
            </div>
            <div class="contact-item">
              <div class="contact-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
              <div class="contact-details">
                <h4 class="contact-label">Address</h4>
                <p class="contact-value">
                  Riverside Office Park<br>
                  Hennops House, 1303 Heuwel Avenue<br>
                  Cnr. Lenchen South and Heuwel Avenue<br>
                  Centurion, Pretoria, 0167
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="landing-footer">
        <div class="container">
          <div class="footer-content">
            <div class="footer-logo">
              <img src="/assets/images/logos/WRSETA_logo-2.png" alt="W&RSETA Logo" class="logo-img">
            </div>
            <div class="footer-links">
              <a href="#home" class="footer-link">Home</a>
              <a href="#about" class="footer-link">About Us</a>
              <a href="#programmes" class="footer-link">Learnerships</a>
              <a href="#contact" class="footer-link">Contact Us</a>
            </div>
            <div class="footer-copyright">
              <p>&copy; {{ currentYear }} Wholesale & Retail SETA. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .landing-page {
      min-height: 100vh;
      background: #ffffff;
    }

    /* Navigation */
    .landing-nav {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      padding: 1rem 0;
    }

    .nav-wrapper {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .nav-logo .logo-img {
      height: 50px;
      width: auto;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 2rem;
    }

    .nav-link {
      color: var(--seta-text-primary, #212529);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.9375rem;
      transition: color 0.2s ease;

      &:hover {
        color: var(--seta-primary, #008550);
      }
    }

    .nav-link-signin {
      background: linear-gradient(135deg, var(--seta-primary, #008550) 0%, var(--seta-primary-dark, #006640) 100%);
      color: white !important;
      padding: 0.5rem 1.25rem;
      border-radius: 0.5rem;
      font-weight: 600;

      &:hover {
        background: linear-gradient(135deg, var(--seta-primary-dark, #006640) 0%, #004d30 100%);
        color: white !important;
      }
    }

    /* Hero Section */
    .hero-section {
      position: relative;
      min-height: 100vh;
      display: flex;
      align-items: center;
      padding: 12rem 0 8rem;
      background: linear-gradient(135deg, rgba(0, 133, 80, 0.05) 0%, rgba(0, 133, 80, 0.02) 100%);
      overflow: hidden;
    }

    .hero-background {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: url('/assets/images/Home-BG-01.jpg');
      background-size: cover;
      background-position: center;
      z-index: 0;
    }

    .hero-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.65);
      z-index: 1;
    }

    .hero-content-wrapper {
      position: relative;
      z-index: 2;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3rem;
      align-items: center;
      max-width: 1400px;
      margin: 0 auto;

      @media (max-width: 991.98px) {
        grid-template-columns: 1fr;
        gap: 2rem;
      }
    }

    .hero-text {
      text-align: left;

      @media (max-width: 991.98px) {
        text-align: center;
      }
    }

    .hero-learnership-card {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .hero-title {
      font-size: 3rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 1.5rem;
      line-height: 1.2;
      letter-spacing: -0.02em;

      @media (max-width: 991.98px) {
        font-size: 2.5rem;
      }

      @media (max-width: 768px) {
        font-size: 2rem;
      }
    }

    .hero-subtitle {
      font-size: 1.25rem;
      color: #fff;
      margin-bottom: 2.5rem;
      line-height: 1.6;
      max-width: 700px;
      margin-left: auto;
      margin-right: auto;

      @media (max-width: 768px) {
        font-size: 1.125rem;
      }
    }

    .hero-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-start;
      flex-wrap: wrap;

      @media (max-width: 991.98px) {
        justify-content: center;
      }
    }

    .btn-hero {
      padding: 0.875rem 2rem;
      font-size: 1.125rem;
      font-weight: 600;
      border-radius: 0.5rem;
      color: #fff !important;

      &:hover, &:focus {
        color: #fff !important;
      }
    }

    .btn-outline-hero {
      padding: 0.875rem 2rem;
      font-size: 1.125rem;
      font-weight: 600;
      border-radius: 0.5rem;
      border: 2px solid var(--seta-primary, #008550);
      color: var(--seta-primary, #008550);
      background: transparent;
      text-decoration: none;
      transition: all 0.2s ease;

      &:hover {
        background: var(--seta-primary, #008550);
        color: white;
      }
    }

    /* Features Section */
    .features-section {
      padding: 5rem 0;
      background: white;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
    }

    .feature-card {
      text-align: center;
      padding: 2.5rem 2rem;
      background: linear-gradient(135deg, var(--seta-primary, #008550) 0%, var(--seta-primary-dark, #006640) 100%);
      border-radius: 1rem;
      box-shadow: 0 4px 20px rgba(0, 133, 80, 0.3);
      transition: transform 0.3s ease, box-shadow 0.3s ease;

      &:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 30px rgba(0, 133, 80, 0.4);
      }
    }

    .feature-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 1.5rem;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      backdrop-filter: blur(10px);
    }

    .feature-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #fff;
      margin-bottom: 1rem;
    }

    .feature-description {
      color: rgba(255, 255, 255, 0.9);
      line-height: 1.6;
    }

    /* Applications Section */
    .applications-section {
      padding: 5rem 0;
      background: linear-gradient(135deg, #008550 0%, #006640 100%);
    }

    .applications-header-section {
      text-align: center;
      margin-bottom: 3rem;
    }

    .badge-new {
      display: inline-block;
      background: var(--seta-primary, #008550);
      color: white;
      padding: 0.375rem 0.875rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }

    .applications-title {
      font-size: 2.5rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 1rem;
    }

    .applications-intro {
      font-size: 1.125rem;
      color: rgba(255, 255, 255, 0.9);
      max-width: 600px;
      margin: 0 auto;
    }

    .learnerships-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 2rem;
      margin-bottom: 3rem;
    }

    .learnership-card-featured {
      background: white;
      border-radius: 1rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      overflow: hidden;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      display: flex;
      flex-direction: column;

      &:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
      }
    }

    .learnership-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      background: linear-gradient(135deg, rgba(0, 133, 80, 0.08) 0%, rgba(0, 133, 80, 0.03) 100%);
      border-bottom: 1px solid rgba(0, 133, 80, 0.1);
    }

    .learnership-badge-featured {
      display: inline-flex;
      align-items: center;
      padding: 0.35rem 0.75rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: white;
      background: linear-gradient(135deg, var(--seta-primary, #008550) 0%, var(--seta-primary-dark, #006640) 100%);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .learnership-code {
      font-size: 0.8125rem;
      color: var(--seta-text-secondary, #6c757d);
      font-weight: 500;
    }

    .learnership-card-body {
      padding: 1.5rem;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .learnership-title-featured {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--seta-text-primary, #212529);
      margin-bottom: 1rem;
      line-height: 1.4;
    }

    .learnership-description-featured {
      font-size: 0.9375rem;
      color: var(--seta-text-secondary, #6c757d);
      line-height: 1.6;
      margin-bottom: 1.5rem;
      flex: 1;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .learnership-meta-featured {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }

    .meta-item-featured {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--seta-text-secondary, #6c757d);

      svg {
        width: 16px;
        height: 16px;
        color: var(--seta-primary, #008550);
        flex-shrink: 0;
      }
    }

    .learnership-footer-featured {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
    }

    .learnership-spots {
      font-size: 0.875rem;
      color: var(--seta-text-secondary, #6c757d);

      strong {
        color: var(--seta-primary, #008550);
        font-weight: 600;
      }
    }

    .applications-footer {
      text-align: center;
      margin-top: 2rem;

      .btn-outline-primary {
        color: #fff !important;
        border-color: #fff !important;
        background: transparent;

        &:hover, &:focus {
          background: rgba(255, 255, 255, 0.2) !important;
          border-color: #fff !important;
          color: #fff !important;
        }

        svg {
          color: #fff !important;
          stroke: #fff !important;
        }
      }
    }

    /* About Section */
    .about-section {
      padding: 6rem 0;
      background: white;
      position: relative;
      overflow: hidden;
    }

    .about-pattern {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: 
        radial-gradient(circle at 20% 30%, rgba(0, 133, 80, 0.05) 0%, transparent 50%),
        radial-gradient(circle at 80% 70%, rgba(0, 133, 80, 0.05) 0%, transparent 50%);
      pointer-events: none;
      z-index: 0;
    }

    .about-content {
      max-width: 900px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
    }

    .about-highlights {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 2rem;
      margin: 3rem 0;
      padding: 2rem 0;
    }

    .highlight-card {
      background: linear-gradient(135deg, rgba(0, 133, 80, 0.05) 0%, rgba(0, 133, 80, 0.02) 100%);
      border: 2px solid rgba(0, 133, 80, 0.1);
      border-radius: 1rem;
      padding: 2rem;
      text-align: center;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, var(--seta-primary, #008550) 0%, var(--seta-primary-dark, #006640) 100%);
        transform: scaleX(0);
        transition: transform 0.3s ease;
      }

      &:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 25px rgba(0, 133, 80, 0.15);
        border-color: var(--seta-primary, #008550);

        &::before {
          transform: scaleX(1);
        }

        .highlight-icon {
          transform: scale(1.1) rotate(5deg);
        }
      }
    }

    .highlight-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 1.5rem;
      background: linear-gradient(135deg, var(--seta-primary, #008550) 0%, var(--seta-primary-dark, #006640) 100%);
      border-radius: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 4px 15px rgba(0, 133, 80, 0.3);
      transition: transform 0.3s ease;

      svg {
        width: 32px;
        height: 32px;
      }
    }

    .highlight-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--seta-primary, #008550);
      margin-bottom: 0.75rem;
    }

    .highlight-text {
      font-size: 0.9375rem;
      color: var(--seta-text-secondary, #6c757d);
      line-height: 1.6;
      margin: 0;
    }

    .section-title {
      font-size: 3rem;
      font-weight: 700;
      color: var(--seta-text-primary, #212529);
      margin-bottom: 2rem;
      line-height: 1.2;
      letter-spacing: -0.02em;

      &.text-center {
        text-align: center;
      }

      .about-section & {
        color: var(--seta-primary, #008550);
      }

      @media (max-width: 768px) {
        font-size: 2rem;
      }
    }

    .title-line {
      display: block;
    }

    .about-subtitle {
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--seta-text-primary, #212529);
      margin-bottom: 1.5rem;
    }

    .about-text {
      p {
        font-size: 1.125rem;
        color: var(--seta-text-secondary, #6c757d);
        line-height: 1.8;
        margin-bottom: 1.5rem;
      }
    }

    .section-subtitle {
      font-size: 1.25rem;
      color: var(--seta-text-secondary, #6c757d);
      margin-bottom: 3rem;

    }

    /* Contact Section */
    .contact-section {
      padding: 6rem 0;
      background: linear-gradient(135deg, rgba(0, 133, 80, 0.05) 0%, rgba(0, 133, 80, 0.02) 100%);
    }

    .contact-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2.5rem;
      max-width: 1000px;
      margin: 0 auto;
    }

    .contact-item {
      display: flex;
      gap: 1.5rem;
      background: white;
      padding: 2rem;
      border-radius: 1rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .contact-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, var(--seta-primary, #008550) 0%, var(--seta-primary-dark, #006640) 100%);
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .contact-label {
      font-size: 1rem;
      font-weight: 600;
      color: var(--seta-text-primary, #212529);
      margin-bottom: 0.5rem;
    }

    .contact-value {
      color: var(--seta-text-secondary, #6c757d);
      margin: 0;
      line-height: 1.6;
    }

    /* Footer */
    .landing-footer {
      background: linear-gradient(135deg, #006640 0%, #004d30 100%);
      color: white;
      padding: 3rem 0 2rem;
    }

    .footer-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2rem;
    }

    .footer-logo .logo-img {
      height: 60px;
      width: auto;
    }

    .footer-links {
      display: flex;
      gap: 2rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    .footer-link {
      color: rgba(255, 255, 255, 0.8);
      text-decoration: none;
      transition: color 0.2s ease;

      &:hover {
        color: white;
      }
    }

    .footer-copyright {
      text-align: center;
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.875rem;
    }

    /* Container */
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 2rem;

      @media (max-width: 768px) {
        padding: 0 1rem;
      }
    }

    /* Hero Learnership Card */
    .learnership-card-hero {
      background: white;
      border-radius: 1rem;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
      overflow: hidden;
      max-width: 450px;
      width: 100%;
      transition: transform 0.3s ease, box-shadow 0.3s ease;

      &:hover {
        transform: translateY(-5px);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
      }
    }

    .learnership-card-hero-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      background: linear-gradient(135deg, var(--seta-primary, #008550) 0%, var(--seta-primary-dark, #006640) 100%);
      border-bottom: none;
    }

    .learnership-badge-hero {
      display: inline-flex;
      align-items: center;
      padding: 0.35rem 0.75rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--seta-primary, #008550);
      background: white;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .learnership-code-hero {
      font-size: 0.8125rem;
      color: rgba(255, 255, 255, 0.9);
      font-weight: 500;
    }

    .learnership-card-hero-body {
      padding: 1.5rem;
    }

    .learnership-title-hero {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--seta-text-primary, #212529);
      margin-bottom: 1rem;
      line-height: 1.4;
    }

    .learnership-description-hero {
      font-size: 0.9375rem;
      color: var(--seta-text-secondary, #6c757d);
      line-height: 1.6;
      margin-bottom: 1.5rem;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .learnership-meta-hero {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }

    .meta-item-hero {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: var(--seta-text-secondary, #6c757d);

      svg {
        width: 16px;
        height: 16px;
        color: var(--seta-primary, #008550);
        flex-shrink: 0;
      }
    }

    .learnership-footer-hero {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .learnership-spots-hero {
      font-size: 0.875rem;
      color: var(--seta-text-secondary, #6c757d);

      strong {
        color: var(--seta-primary, #008550);
        font-weight: 600;
      }
    }

    @media (max-width: 768px) {
      .nav-links {
        gap: 1rem;
      }

      .nav-link {
        font-size: 0.875rem;
      }

      .hero-section {
        padding: 6rem 0 3rem;
      }

      .learnership-card-hero {
        max-width: 100%;
      }

      .features-grid {
        grid-template-columns: 1fr;
      }

      .applications-title {
        font-size: 2rem;
      }

      .learnerships-grid {
        grid-template-columns: 1fr;
      }

      .learnership-footer-featured {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;

        .btn {
          width: 100%;
        }
      }

      .contact-info {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class LandingComponent implements OnInit {
  private readonly iconService = inject(IconService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  
  currentYear = new Date().getFullYear();
  
  featuredLearnerships: AvailableLearnership[] = [
    {
      id: 1,
      title: 'National Certificate: Wholesale and Retail Operations',
      code: '58206',
      nqfLevel: 2,
      credits: 120,
      duration: '12 months',
      startDate: new Date('2025-02-01'),
      applicationDeadline: new Date('2025-01-20'),
      category: 'Business Administration',
      location: 'Johannesburg, Gauteng',
      provider: 'WRSETA Accredited Provider',
      description: 'Gain comprehensive skills in wholesale and retail operations including customer service, stock management, sales techniques, and retail operations. This qualification prepares you for various roles in the retail industry.',
      requirements: [
        'Grade 10 or equivalent',
        'Basic numeracy and literacy',
        'Customer service orientation',
        'South African citizen or permanent resident'
      ],
      benefits: [
        'Entry-level qualification',
        'Practical retail experience',
        'Customer service skills',
        'Career growth in retail'
      ],
      isOpen: true,
      availableSpots: 15,
      totalSpots: 25
    },
    {
      id: 2,
      title: 'National Certificate: Service Station Operations (Forecourt Attendant)',
      code: '62709',
      nqfLevel: 2,
      credits: 120,
      duration: '12 months',
      startDate: new Date('2025-03-01'),
      applicationDeadline: new Date('2025-02-15'),
      category: 'Business Administration',
      location: 'Cape Town, Western Cape',
      provider: 'WRSETA Accredited Provider',
      description: 'Specialized training for forecourt attendants in service stations. Covers fuel dispensing, customer service, basic vehicle checks, and health and safety protocols specific to the petroleum retail environment.',
      requirements: [
        'Grade 9 or equivalent',
        'Good communication skills',
        'Physically fit',
        'Customer-focused attitude'
      ],
      benefits: [
        'Specialized industry skills',
        'Customer interaction experience',
        'Safety training',
        'Employment opportunities in service stations'
      ],
      isOpen: true,
      availableSpots: 10,
      totalSpots: 20
    },
    {
      id: 3,
      title: 'National Certificate: Wholesale and Retail Operations (Retail Sales)',
      code: '63409',
      nqfLevel: 3,
      credits: 120,
      duration: '12-18 months',
      startDate: new Date('2025-02-15'),
      applicationDeadline: new Date('2025-01-25'),
      category: 'Business Administration',
      location: 'Durban, KwaZulu-Natal',
      provider: 'WRSETA Accredited Provider',
      description: 'Focuses on advanced retail sales techniques, product knowledge, merchandising, and customer relationship management. Develop skills to excel in a dynamic retail sales environment and drive business growth.',
      requirements: [
        'Grade 10 or equivalent',
        'Previous sales experience beneficial',
        'Strong interpersonal skills',
        'Goal-oriented mindset'
      ],
      benefits: [
        'Advanced sales techniques',
        'Product knowledge expertise',
        'Customer retention strategies',
        'Higher earning potential'
      ],
      isOpen: true,
      availableSpots: 12,
      totalSpots: 30
    }
  ];

  ngOnInit(): void {
    // Redirect authenticated users to dashboard
    if (this.authService.isAuthenticated) {
      this.router.navigate(['/app/dashboard']);
      return;
    }
    
    // Smooth scroll for anchor links - wait for DOM to be ready
    setTimeout(() => {
      document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', (e) => {
          const href = anchor.getAttribute('href');
          if (href && href !== '#' && href.startsWith('#')) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        });
      });
    }, 0);
  }

  getSafeIcon(iconName: string): SafeHtml {
    const iconPath = this.iconService.getIconPath(iconName);
    return this.sanitizer.bypassSecurityTrustHtml(iconPath);
  }
}

