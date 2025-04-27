using System.Text.Json;

namespace MajdataPlayUpdater
{
    partial class MainWindow
    {
        /// <summary>
        ///  Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        ///  Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            MyHttpClient.Dispose();
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        private System.Windows.Forms.ComboBox cmbReleaseType;
        private System.Windows.Forms.Button btnCheckUpdate;
        private System.Windows.Forms.Button btnGenerateJson;
        private System.Windows.Forms.Button btnPerformUpdate;
        private System.Windows.Forms.TextBox txtProxy;
        private System.Windows.Forms.Label SetProxyHint;
        private System.Windows.Forms.Button btnEnsureProxy;
        private System.Windows.Forms.TextBox txtLog;
        private System.Windows.Forms.ProgressBar progressBar;

        #region Windows Form Designer generated code

        /// <summary>
        ///  Required method for Designer support - do not modify
        ///  the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            cmbReleaseType = new ComboBox();
            btnCheckUpdate = new Button();
            btnGenerateJson = new Button();
            btnPerformUpdate = new Button();
            txtProxy = new TextBox();
            SetProxyHint = new Label();
            btnEnsureProxy = new Button();
            txtLog = new TextBox();
            progressBar = new ProgressBar();
            SuspendLayout();
            // 
            // cmbReleaseType
            // 
            cmbReleaseType.DropDownStyle = ComboBoxStyle.DropDownList;
            cmbReleaseType.FormattingEnabled = true;
            cmbReleaseType.Items.AddRange(new object[] { "Nightly", "Stable" });
            cmbReleaseType.Location = new Point(10, 10);
            cmbReleaseType.Name = "cmbReleaseType";
            cmbReleaseType.Size = new Size(480, 25);
            cmbReleaseType.TabIndex = 0;
            // 
            // btnCheckUpdate
            // 
            btnCheckUpdate.Location = new Point(10, 40);
            btnCheckUpdate.Name = "btnCheckUpdate";
            btnCheckUpdate.Size = new Size(230, 30);
            btnCheckUpdate.TabIndex = 1;
            btnCheckUpdate.Text = "检查更新";
            btnCheckUpdate.Click += BtnCheckUpdate_Click;
            // 
            // btnGenerateJson
            // 
            btnGenerateJson.Location = new Point(250, 40);
            btnGenerateJson.Name = "btnGenerateJson";
            btnGenerateJson.Size = new Size(240, 30);
            btnGenerateJson.TabIndex = 2;
            btnGenerateJson.Text = "生成Json";
            btnGenerateJson.Click += BtnGenerateJson_Click;
            // 
            // btnPerformUpdate
            // 
            btnPerformUpdate.Location = new Point(10, 80);
            btnPerformUpdate.Name = "btnPerformUpdate";
            btnPerformUpdate.Size = new Size(480, 30);
            btnPerformUpdate.TabIndex = 3;
            btnPerformUpdate.Text = "开始更新";
            btnPerformUpdate.Click += BtnPerformUpdate_Click;
            // 
            // txtProxy
            // 
            txtProxy.Location = new Point(10, 120);
            txtProxy.Name = "txtProxy";
            txtProxy.Size = new Size(370, 23);
            txtProxy.TabIndex = 4;
            txtProxy.TextChanged += TxtProxy_TextChanged;
            // 
            // SetProxyHint
            // 
            SetProxyHint.ForeColor = Color.Gray;
            SetProxyHint.Location = new Point(10, 120);
            SetProxyHint.Name = "SetProxyHint";
            SetProxyHint.Size = new Size(370, 25);
            SetProxyHint.TabIndex = 5;
            SetProxyHint.Text = "请输入代理地址，例如 http://127.0.0.1:8888";
            SetProxyHint.TextAlign = ContentAlignment.MiddleLeft;
            // 
            // btnEnsureProxy
            // 
            btnEnsureProxy.Location = new Point(390, 120);
            btnEnsureProxy.Name = "btnEnsureProxy";
            btnEnsureProxy.Size = new Size(100, 25);
            btnEnsureProxy.TabIndex = 6;
            btnEnsureProxy.Text = "确认";
            btnEnsureProxy.Click += BtnEnsureProxy_Click;
            // 
            // txtLog
            // 
            txtLog.Font = new Font("Consolas", 10F);
            txtLog.Location = new Point(10, 160);
            txtLog.Multiline = true;
            txtLog.Name = "txtLog";
            txtLog.ReadOnly = true;
            txtLog.ScrollBars = ScrollBars.Vertical;
            txtLog.Size = new Size(480, 100);
            txtLog.TabIndex = 7;
            // 
            // progressBar
            // 
            progressBar.Location = new Point(10, 270);
            progressBar.Name = "progressBar";
            progressBar.Size = new Size(480, 20);
            progressBar.Style = ProgressBarStyle.Continuous;
            progressBar.TabIndex = 8;
            // 
            // MainWindow
            // 
            ClientSize = new Size(500, 300);
            Controls.Add(cmbReleaseType);
            Controls.Add(btnCheckUpdate);
            Controls.Add(btnGenerateJson);
            Controls.Add(btnPerformUpdate);
            Controls.Add(txtProxy);
            Controls.Add(SetProxyHint);
            Controls.Add(btnEnsureProxy);
            Controls.Add(txtLog);
            Controls.Add(progressBar);
            Name = "MainWindow";
            Text = "MajdataPlay更新器";
            ResumeLayout(false);
            PerformLayout();
        }
        #endregion
    }
}
