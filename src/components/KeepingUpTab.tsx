'use client';

import React, { useState } from 'react';
import { Heart, Copy, Check, Sparkles, User, Lock, Calendar, MessageCircle, AlertCircle } from 'lucide-react';
import styles from './KeepingUpTab.module.css';

export default function KeepingUpTab() {
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const username = 'novthesixth';
  const password = 'Terraboy99#';

  const copyToClipboard = async (text: string, type: 'username' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'username') {
        setCopiedUsername(true);
        setTimeout(() => setCopiedUsername(false), 2000);
      } else {
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <Heart className={styles.heartIcon} fill="var(--color-blush)" size={24} />
          <h2 className={styles.title}>Keeping Up</h2>
        </div>
        <p className={styles.subtitle}>
          Updates, letters, and important notes just for you.
        </p>
      </div>

      {/* Feed Container */}
      <div className={styles.feedList}>
        <div className={styles.feedCard}>
          {/* Post Header */}
          <div className={styles.postHeader}>
            <div className={styles.authorBadge}>
              <div className={styles.authorAvatar}>M</div>
              <div className={styles.authorMeta}>
                <span className={styles.authorName}>Mega</span>
                <span className={styles.postDate}>
                  <Calendar size={12} />
                  <span>July 9, 2026</span>
                </span>
              </div>
            </div>
            <span className={styles.priorityBadge}>
              <AlertCircle size={12} />
              <span>Important Update</span>
            </span>
          </div>

          {/* Credentials Highlight Panel */}
          <div className={styles.credentialsCard}>
            <div className={styles.credentialsHeader}>
              <Sparkles size={14} className={styles.sparkleIcon} />
              <span>Verification Details</span>
            </div>
            <div className={styles.credentialsBody}>
              <div className={styles.credentialItem}>
                <div className={styles.credLabel}>
                  <User size={12} />
                  <span>Snapchat Username</span>
                </div>
                <div className={styles.credValueWrapper}>
                  <code className={styles.credValue}>{username}</code>
                  <button 
                    onClick={() => copyToClipboard(username, 'username')}
                    className={styles.copyBtn}
                    title="Copy Username"
                  >
                    {copiedUsername ? <Check size={12} className={styles.checkIcon} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              <div className={styles.credentialItem}>
                <div className={styles.credLabel}>
                  <Lock size={12} />
                  <span>Password</span>
                </div>
                <div className={styles.credValueWrapper}>
                  <code className={styles.credValue}>{password}</code>
                  <button 
                    onClick={() => copyToClipboard(password, 'password')}
                    className={styles.copyBtn}
                    title="Copy Password"
                  >
                    {copiedPassword ? <Check size={12} className={styles.checkIcon} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Letter Body */}
          <div className={styles.letterContent}>
            <p>
              I'd really appreciate if you don't open any DMs, I'm doing this because you're my top priority, 
              you, us, comes first before any other thing, I'd prefer you honestly give someone else the logins 
              and validate what i'm saying if its true or not, nothing else, i promise you i don't want you to 
              see any of it, it's meant for you, the whole idea of it being a surprise is ruined once you get 
              to see it but for you to know i'm being serious, i've attached the login details, I didn't say a 
              word since because I needed you to trust me, no iota of trust, you didn't even go like "hmm okay o", 
              this is something meant for you, your last birthday I outsourced months earlier, only thing that 
              made the phone come later was the delay it encountered, you were aware of it, I love seeing the 
              happiness on your face when you get surprised, I love seeing you have that baby moment, I love seeing 
              you extremely happy, that's why I don't tell you about anything prior, I honestly don't want you to 
              see the content but for the sake of our relationship, that's the login. I really will appreciate 
              if you pick any trusted person to check it out and confirm if its gifts or something else. 
              If the person confirms it's something else block me on snap and all over, but if the person 
              confirms it has to do with you, I geniunely would love you come back and we talk about this better, 
              I'm still standing by it, I do not want you to see it but let's have a third party for trust sake, 
              you don't know how much those little moments of happiness on your face means to me, I still remember 
              how happy you were early this year when your phone came in, I still remember how happy and unexpecting 
              you looked on your birthday, other tiny little moments, these are the things I live with, those are 
              the moments that feels surreal, the moment that feels like it adds longer life to me, seeing you happy 
              geniunely makes me happy, I've heard you talk about a lot of things you need, I've filtered out some 
              of them down to the ones you actually need, I'm doing them silently without saying a word and now 
              somehow it's about to cost us the relationship. It's very unfair you don't trust me.
            </p>

            <p>
              Last night the only reason I didn't sleep in the room was because you locked the door, not with key, 
              you just closed it like you needed privacy or something, coming close to you was already irritating 
              to you what more coming in when you wanted privacy, i didn't mind sleeping on the scraggy bed, 
              i just needed you not to freak out or panic or get upset to the point you panic, throughout this whole 
              thing i just try to get you to listen to me, when you persist i just walk away because i know this 
              is meant for you and there's no ill intentions to it, but asking for a break, then now looking like 
              i wanted it, it's my fault we're going on a break, you do not trust me, you don't, the slightest 
              thing you're coming up with last year this and that, we've been living happily through the year, 
              making improvements and now it's going to be this? A birthday prep? That's what's going to cause 
              a breakup? Feels like you lied about the break, it's just a subtle way for you to leave but you 
              need to believe me baby, I love you and I don't want anything to happen to our relationship but 
              promise me you'd have someone else check it out, someone that won't tell you the gift items coming, 
              the person is just there for verification, pinky promise baby, and when you're done reading this 
              and you're calm enough, just send me a snap of your pinky either on whatsapp or snap, I love you Abunyom❤️
            </p>
          </div>

          {/* Card Footer */}
          <div className={styles.postFooter}>
            <div className={styles.engagement}>
              <Heart className={styles.interactiveHeart} fill="var(--color-blush)" size={16} />
              <span>With all my love</span>
            </div>
            <span className={styles.pinkyPromiseText}>🤙 Pinky Promise</span>
          </div>
        </div>
      </div>
    </div>
  );
}
