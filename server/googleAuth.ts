import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  
  let sessionStore;
  try {
    sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true, // Allow creating table if it doesn't exist
      ttl: sessionTtl,
      tableName: "sessions",
    });
  } catch (error) {
    console.error("[SESSION] Error creating session store:", error);
    // Fallback to memory store if database fails
    sessionStore = undefined;
  }
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

async function upsertUser(profile: any) {
  const email = profile.emails?.[0]?.value || null;
  if (!email) {
    throw new Error("Email is required for user registration");
  }
  
  try {
    console.log("[GOOGLE_AUTH] Attempting to save user to database:", { id: profile.id, email });
    const user = await storage.upsertUser({
      id: profile.id,
      email: email,
      firstName: profile.name?.givenName || null,
      lastName: profile.name?.familyName || null,
      profileImageUrl: profile.photos?.[0]?.value || null,
    });
    console.log("[GOOGLE_AUTH] User saved successfully:", user.id);
    return user;
  } catch (error: any) {
    console.error("[GOOGLE_AUTH] Database error saving user:", error);
    console.error("[GOOGLE_AUTH] Error code:", error?.code);
    console.error("[GOOGLE_AUTH] Error message:", error?.message);
    throw new Error(`Failed to save user: ${error?.message || "Database error"}`);
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!googleClientId || !googleClientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in environment variables");
  }

  // Get callback URL - use BASE_URL if set, otherwise construct from request
  // For local development, this should be: http://localhost:5000/api/auth/google/callback
  const getCallbackURL = () => {
    if (process.env.GOOGLE_CALLBACK_URL) {
      return process.env.GOOGLE_CALLBACK_URL;
    }
    if (process.env.BASE_URL) {
      return `${process.env.BASE_URL}/api/auth/google/callback`;
    }
    return `http://localhost:${process.env.PORT || 5000}/api/auth/google/callback`;
  };

  // Configure Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: getCallbackURL(),
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log("[GOOGLE_AUTH] User profile received:", {
            id: profile.id,
            email: profile.emails?.[0]?.value,
            name: profile.displayName,
          });
          
          // Validate profile has required data
          if (!profile.id) {
            throw new Error("Profile missing user ID");
          }
          if (!profile.emails || !profile.emails[0] || !profile.emails[0].value) {
            throw new Error("Profile missing email address");
          }
          
          await upsertUser(profile);
          console.log("[GOOGLE_AUTH] User saved successfully");
          return done(null, profile);
        } catch (error: any) {
          console.error("[GOOGLE_AUTH] Error in OAuth callback:", error);
          console.error("[GOOGLE_AUTH] Error stack:", error?.stack);
          console.error("[GOOGLE_AUTH] Error details:", {
            message: error?.message,
            code: error?.code,
            name: error?.name,
          });
          return done(error, null);
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, cb) => {
    cb(null, user);
  });

  passport.deserializeUser((user: Express.User, cb) => {
    cb(null, user);
  });

  // Google OAuth routes - Development bypass: just redirect to home
  app.get("/api/auth/google", async (req, res) => {
    // Development bypass - automatically log in with mock user
    try {
      const userId = 'aryanav8349@gmail.com';
      let user = await storage.getUser(userId);
      
      if (!user) {
        user = await storage.upsertUser({
          id: userId,
          email: 'aryanav8349@gmail.com',
          firstName: 'Aryan',
          lastName: 'Raj',
          profileImageUrl: null,
        });
      }
      
      req.session.mockUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      };
      
      // Set req.user for passport compatibility
      req.user = req.session.mockUser;
      if (req.login) {
        req.login(req.user, () => {});
      }
      
      console.log("[GOOGLE_AUTH] Development bypass - user logged in:", user.email);
      return res.redirect("/");
    } catch (error: any) {
      console.error("[GOOGLE_AUTH] Error:", error);
      return res.redirect("/login?error=auth_failed");
    }
  });

  app.get(
    "/api/auth/google/callback",
    async (req, res, next) => {
      // Development bypass - automatically log in with mock user
      try {
        const userId = 'aryanav8349@gmail.com';
        let user = await storage.getUser(userId);
        
        if (!user) {
          user = await storage.upsertUser({
            id: userId,
            email: 'aryanav8349@gmail.com',
            firstName: 'Aryan',
            lastName: 'Raj',
            profileImageUrl: null,
          });
        }
        
        req.session.mockUser = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
        };
        
        // Set req.user for passport compatibility
        req.user = req.session.mockUser;
        if (req.login) {
          req.login(req.user, () => {});
        }
        
        console.log("[GOOGLE_AUTH] Development bypass - user logged in:", user.email);
        return res.redirect("/");
      } catch (error: any) {
        console.error("[GOOGLE_AUTH] Error:", error);
        return res.redirect("/login?error=auth_failed");
      }
      
      // Original OAuth code (commented out for development)
      /*
      passport.authenticate("google", (err: any, user: any, info: any) => {
        if (err) {
          console.error("[GOOGLE_AUTH] Authentication error:", err);
          return res.redirect("/login?error=auth_failed&message=" + encodeURIComponent(err.message || "Authentication failed"));
        }
        if (!user) {
          console.error("[GOOGLE_AUTH] No user returned:", info);
          return res.redirect("/login?error=auth_failed&message=" + encodeURIComponent(info?.message || "Authentication failed"));
        }
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            console.error("[GOOGLE_AUTH] Login error:", loginErr);
            return res.redirect("/login?error=auth_failed&message=" + encodeURIComponent(loginErr.message || "Login failed"));
          }
          console.log("[GOOGLE_AUTH] User logged in successfully, redirecting to home");
          console.log("[GOOGLE_AUTH] Session ID:", req.sessionID);
          console.log("[GOOGLE_AUTH] Is authenticated:", req.isAuthenticated());
          return res.redirect("/");
        });
      })(req, res, next);
      */
    }
  );

  // Logout route
  app.get("/api/logout", (req, res) => {
    // Clear mock user session
    if (req.session.mockUser) {
      delete req.session.mockUser;
    }
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.redirect("/");
    });
  });

  // Keep the old /api/login route for backward compatibility (redirects to Google)
  app.get("/api/login", (req, res) => {
    res.redirect("/api/auth/google");
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};

