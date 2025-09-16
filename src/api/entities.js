import { base44 } from './base44Client';


export const Business = base44.entities.Business;

export const Client = base44.entities.Client;

export const ReviewRequest = base44.entities.ReviewRequest;

export const ReviewTracking = base44.entities.ReviewTracking;

export const ReviewReply = base44.entities.ReviewReply;

export const SocialPost = base44.entities.SocialPost;

export const Sequence = base44.entities.Sequence;

export const Competitor = base44.entities.Competitor;

export const TeamMember = base44.entities.TeamMember;

export const AuditLog = base44.entities.AuditLog;



// auth sdk:
export const User = base44.auth;


// Disable legacy base44 auto-login override in marketing to prevent loops
try {
  if (typeof window !== "undefined" && typeof User !== "undefined" && typeof User.login === "function") {
    // Restore original behavior by no-op wrapping without side effects
    const __origLogin = User.login.bind(User);
    User.login = (...args) => __origLogin(...args);
  }
} catch {}
