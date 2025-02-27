﻿using System;
using System.Security.Claims;
using System.Threading.Tasks;
using gzDAL.Models;
using Microsoft.AspNet.Identity;
using Microsoft.AspNet.Identity.Owin;
using Microsoft.Owin;
using Microsoft.Owin.Security;
using Microsoft.Owin.Security.DataProtection;
using Owin;

namespace gzDAL.Conf
{
    public class EmailService : IIdentityMessageService
    {
        public Task SendAsync(IdentityMessage message)
        {
            // Plug in your email service here to send an email.
            return Task.FromResult(0);
        }
    }

    public class SmsService : IIdentityMessageService
    {
        public Task SendAsync(IdentityMessage message)
        {
            // Plug in your SMS service here to send a text message.
            return Task.FromResult(0);
        }
    }

    public class DataProtectionProviderFactory
    {
        public DataProtectionProviderFactory(Func<IDataProtectionProvider> factory)
        {
            _factory = factory;
        }
        public IDataProtectionProvider Get()
        {
            return _factory();
        }

        private readonly Func<IDataProtectionProvider> _factory;
    }

    // Configure the application user manager used in this application. UserManager is defined in ASP.NET Identity and is used by the application.
    public class ApplicationUserManager : UserManager<ApplicationUser, int>
    {
        public ApplicationUserManager(IUserStore<ApplicationUser, int> store, DataProtectionProviderFactory dataProtectionProviderFactory)
                : base(store)
        {
            // Configure validation logic for usernames
            UserValidator = new UserValidator<ApplicationUser, int>(this)
                            {
                                    AllowOnlyAlphanumericUserNames = false,
                                    RequireUniqueEmail = true
                            };

            // Configure validation logic for passwords
            PasswordValidator = new PasswordValidator
                                {
                                        RequiredLength = 6,
                                        //RequireNonLetterOrDigit = true,
                                        RequireDigit = true,
                                        //RequireLowercase = true,
                                        //RequireUppercase = true,
                                };

            // Configure user lockout defaults
            UserLockoutEnabledByDefault = true;
            DefaultAccountLockoutTimeSpan = TimeSpan.FromMinutes(5);
            MaxFailedAccessAttemptsBeforeLockout = 5;

            // Register two factor authentication providers. This application uses Phone and Emails as a step of receiving a code for verifying the user
            // You can write your own provider and plug it in here.
            RegisterTwoFactorProvider("Phone Code",
                                      new PhoneNumberTokenProvider<ApplicationUser, int>
                                      {
                                              MessageFormat =
                                                      "Your security code is {0}"
                                      });
            RegisterTwoFactorProvider("Email Code",
                                      new EmailTokenProvider<ApplicationUser, int>
                                      {
                                              Subject = "Security Code",
                                              BodyFormat =
                                                      "Your security code is {0}"
                                      });
            EmailService = new EmailService();
            SmsService = new SmsService();
            var dataProtectionProvider = dataProtectionProviderFactory.Get();
            if (dataProtectionProvider != null)
                UserTokenProvider = new DataProtectorTokenProvider<ApplicationUser, int>(dataProtectionProvider.Create("ASP.NET Identity"));
        }

        public static ApplicationUserManager Create(IdentityFactoryOptions<ApplicationUserManager> options,
                                             IOwinContext context)
        {
            return new ApplicationUserManager(new CustomUserStore(context.Get<ApplicationDbContext>()), new DataProtectionProviderFactory(() => options.DataProtectionProvider));
        }
    }

    
    // Configure the application sign-in manager which is used in this application.
    public class ApplicationSignInManager : SignInManager<ApplicationUser, int>
    {
        public ApplicationSignInManager(ApplicationUserManager userManager, IAuthenticationManager authenticationManager)
            : base(userManager, authenticationManager)
        {
        }
        public static ApplicationSignInManager Create(IdentityFactoryOptions<ApplicationSignInManager> options, IOwinContext context)
        {
            return new ApplicationSignInManager(context.GetUserManager<ApplicationUserManager>(), context.Authentication);
        }

        //public override Task<ClaimsIdentity> CreateUserIdentityAsync(ApplicationUser user)
        //{
        //    return user.GenerateUserIdentityAsync((ApplicationUserManager)UserManager, DefaultAuthenticationTypes.ApplicationCookie);
        //}

        //public static ApplicationSignInManager Create(IdentityFactoryOptions<ApplicationSignInManager> options, IOwinContext context)
        //{
        //    return new ApplicationSignInManager(context.GetUserManager<ApplicationUserManager>(), context.Authentication);
        //}
    }
}
