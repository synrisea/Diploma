using Microsoft.Extensions.Logging;
using Resonance.Identity.Application.Common;

namespace Resonance.Identity.Infrastructure.Email;

public class ConsoleEmailSender : IEmailSender
{
    private readonly ILogger<ConsoleEmailSender> _logger;

    public ConsoleEmailSender(ILogger<ConsoleEmailSender> logger)
    {
        _logger = logger;
    }

    public Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "----- DEV EMAIL -----\nTo: {ToEmail}\nSubject: {Subject}\n{Body}\n----------------------",
            toEmail, subject, htmlBody);

        return Task.CompletedTask;
    }
}
