namespace Resonance.Connections.Application.Common;

public record PushMessage(string Title, string Body, IReadOnlyDictionary<string, string> Data);

public interface IPushSender
{
    Task SendAsync(IReadOnlyCollection<string> tokens, PushMessage message, CancellationToken cancellationToken);
}
