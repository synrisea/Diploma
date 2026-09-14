using System.Security.Cryptography;
using System.Text;

namespace Resonance.Identity.Application.Common;

public static class RefreshTokenHasher
{
    public static string Hash(string rawToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
}