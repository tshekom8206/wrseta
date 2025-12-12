import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { User, UserRole } from '../../../interfaces/user.interface';
import { SetaTheme } from '../../../interfaces/seta.interface';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: UserRole[];
  children?: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Input() currentUser: User | null = null;
  @Input() theme: SetaTheme | null = null;
  @Output() toggle = new EventEmitter<void>();

  navItems: NavItem[] = [
    {
      label: 'nav.dashboard',
      icon: 'home',
      route: '/dashboard',
      roles: [UserRole.Admin, UserRole.Staff]
    },
    {
      label: 'nav.verification',
      icon: 'check-circle',
      route: '/verification',
      roles: [UserRole.Admin, UserRole.Staff],
      children: [
        { label: 'nav.singleVerify', icon: 'check', route: '/verification/single', roles: [UserRole.Admin, UserRole.Staff] },
        { label: 'nav.batchVerify', icon: 'upload', route: '/verification/batch', roles: [UserRole.Admin, UserRole.Staff] },
        { label: 'nav.recentVerifications', icon: 'clock', route: '/verification/history', roles: [UserRole.Admin, UserRole.Staff] }
      ]
    },
    {
      label: 'nav.learners',
      icon: 'users',
      route: '/learners',
      roles: [UserRole.Admin, UserRole.Staff],
      children: [
        { label: 'nav.learnerList', icon: 'list', route: '/learners/list', roles: [UserRole.Admin, UserRole.Staff] },
        { label: 'nav.enrollLearner', icon: 'user-plus', route: '/learners/enroll', roles: [UserRole.Admin, UserRole.Staff] },
        { label: 'nav.searchLearner', icon: 'search', route: '/learners/search', roles: [UserRole.Admin, UserRole.Staff] }
      ]
    },
    {
      label: 'nav.reports',
      icon: 'bar-chart-2',
      route: '/reports',
      roles: [UserRole.Admin, UserRole.Staff],
      children: [
        { label: 'nav.verificationReport', icon: 'file-text', route: '/reports/verification', roles: [UserRole.Admin, UserRole.Staff] },
        { label: 'nav.enrollmentReport', icon: 'pie-chart', route: '/reports/enrollment', roles: [UserRole.Admin, UserRole.Staff] },
        { label: 'nav.auditLog', icon: 'activity', route: '/reports/audit', roles: [UserRole.Admin, UserRole.Staff] }
      ]
    },
    {
      label: 'nav.admin',
      icon: 'settings',
      route: '/admin',
      roles: [UserRole.Admin],
      children: [
        { label: 'nav.userManagement', icon: 'user', route: '/admin/users', roles: [UserRole.Admin] },
        { label: 'nav.setaManagement', icon: 'briefcase', route: '/admin/setas', roles: [UserRole.Admin] },
        { label: 'nav.settings', icon: 'sliders', route: '/admin/settings', roles: [UserRole.Admin] }
      ]
    },
    {
      label: 'nav.myPortal',
      icon: 'user',
      route: '/my-portal',
      roles: [UserRole.Learner],
      children: [
        { label: 'nav.myStatus', icon: 'info', route: '/my-portal/status', roles: [UserRole.Learner] },
        { label: 'nav.myCertificates', icon: 'award', route: '/my-portal/certificates', roles: [UserRole.Learner] }
      ]
    }
  ];

  expandedItems: Set<string> = new Set();

  canAccess(item: NavItem): boolean {
    if (!this.currentUser) return false;
    return item.roles.includes(this.currentUser.role);
  }

  toggleExpanded(route: string): void {
    if (this.expandedItems.has(route)) {
      this.expandedItems.delete(route);
    } else {
      this.expandedItems.add(route);
    }
  }

  isExpanded(route: string): boolean {
    return this.expandedItems.has(route);
  }

  getIcon(iconName: string): string {
    return this.getFeatherIcon(iconName);
  }

  private getFeatherIcon(name: string): string {
    const icons: Record<string, string> = {
      'home': '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>',
      'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
      'check': '<polyline points="20 6 9 17 4 12"></polyline>',
      'upload': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>',
      'clock': '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
      'users': '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
      'list': '<line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>',
      'user-plus': '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line>',
      'search': '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>',
      'bar-chart-2': '<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>',
      'file-text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline>',
      'pie-chart': '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path>',
      'activity': '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>',
      'settings': '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>',
      'user': '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
      'briefcase': '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>',
      'sliders': '<line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line>',
      'info': '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>',
      'award': '<circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>',
      'chevron-down': '<polyline points="6 9 12 15 18 9"></polyline>',
      'chevron-right': '<polyline points="9 18 15 12 9 6"></polyline>',
      'menu': '<line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line>'
    };
    return icons[name] || '';
  }
}
