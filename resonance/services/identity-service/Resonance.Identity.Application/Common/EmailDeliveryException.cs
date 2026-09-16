namespace Resonance.Identity.Application.Common;

public class EmailDeliveryException : Exception
{
    public EmailDeliveryException(string message, Exception innerException) : base(message, innerException)
    {
    }
}
