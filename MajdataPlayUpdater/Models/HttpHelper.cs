using System;
using System.Net;
using System.Net.Http;

namespace MajdataPlayUpdater.Models;

public class HttpHelper
{
    public HttpClient Client { get; set; } = new();

    public void RecreateHttpClientWithProxy(string proxyUrl)
    {
        Client.Dispose();

        var isProxyUrlEmpty = proxyUrl.Trim() == string.Empty;

        var handler = new HttpClientHandler
        {
            Proxy = isProxyUrlEmpty ? null : new WebProxy(proxyUrl),
            UseProxy = !isProxyUrlEmpty,
            
        };

        Client = new HttpClient(handler);
        Client.Timeout = TimeSpan.FromMinutes(5);
    }
}